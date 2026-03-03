import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { AudienceFilter } from '@/types/database'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

async function verifyStudioMember(studioId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { authorized: false as const, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return { authorized: false as const, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { authorized: true as const }
}

function buildCustomerQuery(studioId: string, audienceType: string, filter: AudienceFilter) {
  let query = supabase
    .from('customers')
    .select('id')
    .eq('studio_id', studioId)

  if (audienceType === 'customers' && filter.customer_ids?.length) {
    query = query.in('id', filter.customer_ids)
    return query
  }

  if (audienceType === 'segment') {
    if (filter.loyalty_stages?.length) {
      query = query.in('loyalty_stage', filter.loyalty_stages)
    }
    if (filter.tags?.length) {
      query = query.overlaps('tags', filter.tags)
    }
    if (filter.min_balance != null) {
      query = query.gte('balance', filter.min_balance)
    }
    if (filter.min_spend != null) {
      query = query.gte('total_real_spend', filter.min_spend)
    }
    if (filter.has_purchased != null) {
      query = query.eq('has_purchased', filter.has_purchased)
    }
    if (filter.joined_after) {
      query = query.gte('created_at', filter.joined_after)
    }
    if (filter.joined_before) {
      query = query.lte('created_at', filter.joined_before)
    }
  }

  return query
}

type ContentAction = {
  announcement?: string
  action?: 'none' | 'add_balance' | 'cashback_boost'
  amount?: number
  cashback_rate?: number
  cashback_duration_days?: number
}

async function applyContentActions(
  customerIds: string[],
  studioId: string,
  content: ContentAction,
) {
  if (!content || content.action === 'none') return

  if (content.action === 'add_balance' && content.amount && content.amount > 0) {
    // Credit each customer's balance and create a transaction
    for (const customerId of customerIds) {
      const { data: customer } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', customerId)
        .single()

      if (customer) {
        await supabase
          .from('customers')
          .update({ balance: Number(customer.balance) + content.amount })
          .eq('id', customerId)

        await supabase.from('transactions').insert({
          customer_id: customerId,
          studio_id: studioId,
          type: 'adjustment',
          amount: content.amount,
          description: content.announcement || 'Campaign bonus',
        })
      }
    }
  }

  if (content.action === 'cashback_boost' && content.cashback_rate && content.cashback_rate > 0) {
    // Temporarily boost each customer's cashback rate
    // Store the boost info in customer metadata so it can expire
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (content.cashback_duration_days || 30))

    for (const customerId of customerIds) {
      const { data: customer } = await supabase
        .from('customers')
        .select('cashback_rate, metadata')
        .eq('id', customerId)
        .single()

      if (customer) {
        const currentRate = Number(customer.cashback_rate || 0)
        const metadata = (customer.metadata || {}) as Record<string, unknown>

        await supabase
          .from('customers')
          .update({
            cashback_rate: currentRate + content.cashback_rate,
            metadata: {
              ...metadata,
              cashback_boost: {
                original_rate: currentRate,
                bonus_rate: content.cashback_rate,
                expires_at: expiresAt.toISOString(),
              },
            },
          })
          .eq('id', customerId)
      }
    }
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: campaign, error: fetchError } = await supabase
      .from('push_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const auth = await verifyStudioMember(campaign.studio_id)
    if (!auth.authorized) return auth.error

    if (campaign.status === 'sending' || campaign.status === 'completed') {
      return NextResponse.json({ error: 'Campaign already sent or sending' }, { status: 400 })
    }

    // Mark as sending
    await supabase
      .from('push_campaigns')
      .update({ status: 'sending' })
      .eq('id', id)

    // Resolve audience
    const filter = (campaign.audience_filter || {}) as AudienceFilter
    const { data: customers } = await buildCustomerQuery(campaign.studio_id, campaign.audience_type, filter)
    const audienceCount = customers?.length || 0

    if (audienceCount === 0) {
      await supabase
        .from('push_campaigns')
        .update({ status: 'completed', audience_count: 0, sent_count: 0, sent_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ success: true, audienceCount: 0 })
    }

    const customerIds = customers!.map(c => c.id)
    const content = (campaign.content || {}) as ContentAction

    // Apply content actions (add balance, cashback boost, etc.)
    await applyContentActions(customerIds, campaign.studio_id, content)

    // Fire push via pass service (to refresh passes with new data)
    // Pass the campaign announcement as pushMessage — it becomes the notification text
    fetch(`${PASS_SERVICE_URL}/api/push/studio/${campaign.studio_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segmentFilter: filter,
        campaignId: id,
        pushMessage: content.announcement || undefined,
      }),
    }).then(async (res) => {
      const result = await res.json().catch(() => ({}))
      await supabase
        .from('push_campaigns')
        .update({
          status: 'completed',
          audience_count: audienceCount,
          sent_count: result.apple?.sent || 0,
          failed_count: result.apple?.failed || 0,
          sent_at: new Date().toISOString(),
        })
        .eq('id', id)
    }).catch(async () => {
      await supabase
        .from('push_campaigns')
        .update({ status: 'failed' })
        .eq('id', id)
    })

    return NextResponse.json({ success: true, audienceCount })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

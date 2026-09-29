import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { AudienceFilter } from '@/types/database'
import { passServiceFetch } from '@/lib/pass-service'
import { verifyStudioAccess } from '@/lib/studio-access'
import { applyContentActions, type ContentAction } from '@/lib/services/campaign-actions-service'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyStudioMember(studioId: string) {
  const result = await verifyStudioAccess(studioId)
  if (!result.authorized) return { authorized: false as const, error: result.error }
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
    await applyContentActions(customerIds, campaign.studio_id, content, { source: 'campaign' })

    // Fire push via pass service (to refresh passes with new data)
    // Pass the campaign announcement as pushMessage — it becomes the notification text
    passServiceFetch(`/api/push/studio/${campaign.studio_id}`, {
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

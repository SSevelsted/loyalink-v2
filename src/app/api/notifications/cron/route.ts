import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { AudienceFilter } from '@/types/database'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'
const CRON_SECRET = process.env.CRON_SECRET

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
    for (const customerId of customerIds) {
      const { data: customer } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', customerId)
        .single()

      if (customer) {
        await supabase
          .from('customers')
          .update({ balance: Number(customer.balance) + content.amount! })
          .eq('id', customerId)

        await supabase.from('transactions').insert({
          customer_id: customerId,
          studio_id: studioId,
          type: 'adjustment',
          amount: content.amount,
          description: content.announcement || 'Automation bonus',
        })
      }
    }
  }

  if (content.action === 'cashback_boost' && content.cashback_rate && content.cashback_rate > 0) {
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
            cashback_rate: currentRate + content.cashback_rate!,
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

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: string[] = []

  // 1. Process scheduled campaigns that are due
  const { data: dueCampaigns } = await supabase
    .from('push_campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())

  for (const campaign of dueCampaigns || []) {
    try {
      await supabase.from('push_campaigns').update({ status: 'sending' }).eq('id', campaign.id)

      const filter = (campaign.audience_filter || {}) as AudienceFilter

      let customerQuery = supabase
        .from('customers')
        .select('id')
        .eq('studio_id', campaign.studio_id)

      if (campaign.audience_type === 'customers' && filter.customer_ids?.length) {
        customerQuery = customerQuery.in('id', filter.customer_ids)
      } else if (campaign.audience_type === 'segment') {
        if (filter.loyalty_stages?.length) customerQuery = customerQuery.in('loyalty_stage', filter.loyalty_stages)
        if (filter.tags?.length) customerQuery = customerQuery.overlaps('tags', filter.tags)
        if (filter.min_balance != null) customerQuery = customerQuery.gte('balance', filter.min_balance)
        if (filter.min_spend != null) customerQuery = customerQuery.gte('total_real_spend', filter.min_spend)
        if (filter.has_purchased != null) customerQuery = customerQuery.eq('has_purchased', filter.has_purchased)
        if (filter.joined_after) customerQuery = customerQuery.gte('created_at', filter.joined_after)
        if (filter.joined_before) customerQuery = customerQuery.lte('created_at', filter.joined_before)
      }

      const { data: customers } = await customerQuery
      const audienceCount = customers?.length || 0
      const customerIds = customers?.map(c => c.id) || []

      // Apply content actions (add balance, cashback boost, etc.)
      const campaignContent = (campaign.content || {}) as ContentAction
      if (customerIds.length > 0) {
        await applyContentActions(customerIds, campaign.studio_id, campaignContent)
      }

      const res = await fetch(`${PASS_SERVICE_URL}/api/push/studio/${campaign.studio_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentFilter: filter, campaignId: campaign.id }),
      })
      const result = await res.json().catch(() => ({}))

      await supabase.from('push_campaigns').update({
        status: 'completed',
        audience_count: audienceCount,
        sent_count: result.apple?.sent || 0,
        failed_count: result.apple?.failed || 0,
        sent_at: new Date().toISOString(),
      }).eq('id', campaign.id)

      results.push(`Campaign ${campaign.id}: sent to ${audienceCount} customers`)
    } catch {
      await supabase.from('push_campaigns').update({ status: 'failed' }).eq('id', campaign.id)
      results.push(`Campaign ${campaign.id}: failed`)
    }
  }

  // 2. Process time-based automations
  const { data: automations } = await supabase
    .from('push_automations')
    .select('*')
    .eq('is_enabled', true)
    .in('trigger_type', ['days_since_join', 'days_inactive', 'birthday'])

  for (const automation of automations || []) {
    try {
      const config = automation.trigger_config as Record<string, unknown>
      const now = new Date()
      let customerQuery = supabase
        .from('customers')
        .select('id')
        .eq('studio_id', automation.studio_id)

      if (automation.trigger_type === 'days_since_join') {
        const days = Number(config.days || 30)
        const targetDate = new Date(now.getTime() - days * 86400000)
        const dayStart = targetDate.toISOString().split('T')[0] + 'T00:00:00Z'
        const dayEnd = targetDate.toISOString().split('T')[0] + 'T23:59:59Z'
        customerQuery = customerQuery.gte('created_at', dayStart).lte('created_at', dayEnd)
      } else if (automation.trigger_type === 'days_inactive') {
        const days = Number(config.days || 14)
        const cutoff = new Date(now.getTime() - days * 86400000).toISOString()
        customerQuery = customerQuery.lte('updated_at', cutoff)
      } else if (automation.trigger_type === 'birthday') {
        // Birthday check requires metadata.birthday field
        // We match customers whose birthday month+day matches today (or N days from now)
        const daysBefore = Number(config.days_before || 0)
        const target = new Date(now.getTime() + daysBefore * 86400000)
        const monthDay = `${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
        // Use metadata->birthday text match on month-day suffix
        customerQuery = customerQuery.like('metadata->>birthday', `%-${monthDay}`)
      }

      // Apply audience filter
      const filter = (automation.audience_filter || {}) as AudienceFilter
      if (filter.loyalty_stages?.length) customerQuery = customerQuery.in('loyalty_stage', filter.loyalty_stages)
      if (filter.tags?.length) customerQuery = customerQuery.overlaps('tags', filter.tags)

      const { data: customers } = await customerQuery
      if (!customers?.length) continue

      // Dedup: filter out customers already processed by this automation
      const { data: existingLogs } = await supabase
        .from('push_automation_logs')
        .select('customer_id')
        .eq('automation_id', automation.id)
        .in('customer_id', customers.map(c => c.id))

      const processedIds = new Set(existingLogs?.map(l => l.customer_id) || [])
      const newCustomerIds = customers.map(c => c.id).filter(id => !processedIds.has(id))

      if (newCustomerIds.length === 0) continue

      // Apply content actions (add balance, cashback boost, etc.)
      const content = (automation.content || {}) as ContentAction
      await applyContentActions(newCustomerIds, automation.studio_id, content)

      // Send push
      await fetch(`${PASS_SERVICE_URL}/api/push/studio/${automation.studio_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentFilter: { customer_ids: newCustomerIds },
          automationId: automation.id,
        }),
      })

      // Log dedup entries
      const logs = newCustomerIds.map(customerId => ({
        automation_id: automation.id,
        studio_id: automation.studio_id,
        customer_id: customerId,
        status: 'sent',
      }))
      await supabase.from('push_automation_logs').insert(logs)

      // Update automation stats
      await supabase.from('push_automations').update({
        last_run_at: now.toISOString(),
        run_count: (automation.run_count || 0) + 1,
      }).eq('id', automation.id)

      results.push(`Automation ${automation.id}: sent to ${newCustomerIds.length} customers`)
    } catch {
      results.push(`Automation ${automation.id}: failed`)
    }
  }

  return NextResponse.json({ success: true, results })
}

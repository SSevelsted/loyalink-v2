import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { AudienceFilter } from '@/types/database'
import { passServiceFetch } from '@/lib/pass-service'
import { sendWinBack } from '@/lib/email/send'
import { applyContentActions, type ContentAction } from '@/lib/services/campaign-actions-service'
import { verifyCronSecret } from '@/lib/cron'
import { campaignFailedCount, campaignSentCount, pushSegmentFilter, resolveCampaignAudienceIds } from '@/lib/campaign-audience'
import { chunk, renderFriendGift } from '@/lib/wallet-messages'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 300

/**
 * Sends due scheduled campaigns and runs the time-based automations.
 * Vercel cron calls GET every 15 min (vercel.json) with
 * `Authorization: Bearer CRON_SECRET`. POST stays for manual runs.
 */
export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}

async function run(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get('authorization'))) {
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
      // Claim the campaign: only one run moves it from scheduled to sending,
      // so two overlapping cron runs never send it twice.
      const { data: claimed } = await supabase
        .from('push_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id)
        .eq('status', 'scheduled')
        .select('id')
      if (!claimed?.length) continue

      const filter = (campaign.audience_filter || {}) as AudienceFilter
      const campaignContent = (campaign.content || {}) as ContentAction & { header?: string }

      // Same text as the manual send route: the announcement is the
      // notification. {friend_gift} renders once; no amount = no send.
      let pushMessage: string | undefined
      if (campaignContent.announcement?.trim()) {
        const { data: studio } = await supabase.from('studios').select('settings').eq('id', campaign.studio_id).single()
        const rendered = renderFriendGift(campaignContent.announcement, (studio?.settings ?? null) as Record<string, unknown> | null)
        if (!rendered.ok) {
          console.error(`[cron] campaign ${campaign.id} refused: ${rendered.error}`)
          await supabase.from('push_campaigns').update({ status: 'failed' }).eq('id', campaign.id)
          results.push(`Campaign ${campaign.id}: refused, {friend_gift} has no amount`)
          continue
        }
        pushMessage = rendered.text
      }

      // Paged: the true audience, not the first 1000 rows.
      const customerIds = await resolveCampaignAudienceIds(supabase, campaign.studio_id, campaign.audience_type, filter)
      const audienceCount = customerIds.length

      if (audienceCount === 0) {
        await supabase.from('push_campaigns').update({
          status: 'completed', audience_count: 0, sent_count: 0, sent_at: new Date().toISOString(),
        }).eq('id', campaign.id)
        results.push(`Campaign ${campaign.id}: no matching customers`)
        continue
      }

      // Apply content actions (add balance, cashback boost, etc.)
      await applyContentActions(customerIds, campaign.studio_id, campaignContent, { source: 'campaign' })

      const res = await passServiceFetch(`/api/push/studio/${campaign.studio_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentFilter: pushSegmentFilter(campaign.audience_type, filter),
          campaignId: campaign.id,
          pushMessage,
          pushHeader: campaignContent.header || undefined,
        }),
      })
      if (!res.ok) throw new Error(`pass-service ${res.status}`)
      const result = await res.json().catch(() => ({}))

      await supabase.from('push_campaigns').update({
        status: 'completed',
        audience_count: audienceCount,
        sent_count: campaignSentCount(result),
        failed_count: campaignFailedCount(result),
        sent_at: new Date().toISOString(),
      }).eq('id', campaign.id)

      results.push(`Campaign ${campaign.id}: sent to ${audienceCount} customers`)
    } catch (err) {
      console.error(`[cron] campaign ${campaign.id} failed:`, err)
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
      const buildCustomerQuery = () => {
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
        return customerQuery.order('id')
      }

      // Paged: past the 1000-row cap.
      const customerIdsAll: string[] = []
      for (let from = 0; ; from += 1000) {
        const { data: page, error } = await buildCustomerQuery().range(from, from + 999)
        if (error) throw new Error(error.message)
        customerIdsAll.push(...(page || []).map(c => c.id as string))
        if (!page || page.length < 1000) break
      }
      if (customerIdsAll.length === 0) continue

      // Dedup: filter out customers already processed by this automation (chunked `.in()`)
      const processedIds = new Set<string>()
      for (const ids of chunk(customerIdsAll)) {
        const { data: existingLogs } = await supabase
          .from('push_automation_logs')
          .select('customer_id')
          .eq('automation_id', automation.id)
          .in('customer_id', ids)
        for (const l of existingLogs || []) processedIds.add(l.customer_id)
      }
      const newCustomerIds = customerIdsAll.filter(id => !processedIds.has(id))

      if (newCustomerIds.length === 0) continue

      const content = (automation.content || {}) as ContentAction & { header?: string }

      // Same notification text rule as campaigns. A {friend_gift} text with
      // no amount is skipped before any balance moves.
      let pushMessage: string | undefined
      if (content.announcement?.trim()) {
        const { data: studio } = await supabase.from('studios').select('settings').eq('id', automation.studio_id).single()
        const rendered = renderFriendGift(content.announcement, (studio?.settings ?? null) as Record<string, unknown> | null)
        if (!rendered.ok) {
          console.error(`[cron] automation ${automation.id} skipped: ${rendered.error}`)
          results.push(`Automation ${automation.id}: skipped, {friend_gift} has no amount`)
          continue
        }
        pushMessage = rendered.text
      }

      // Apply content actions (add balance, cashback boost, etc.)
      await applyContentActions(newCustomerIds, automation.studio_id, content, { source: 'automation' })

      // Send push. 500 ids per call keeps the body under pass-service's 100 kB JSON limit.
      for (const ids of chunk(newCustomerIds, 500)) {
        await passServiceFetch(`/api/push/studio/${automation.studio_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentFilter: { customer_ids: ids },
            automationId: automation.id,
            pushMessage,
            pushHeader: content.header || undefined,
          }),
        })
      }

      // Send win-back emails for inactive customer automations (fire-and-forget)
      if (automation.trigger_type === 'days_inactive') {
        for (const cid of newCustomerIds) {
          sendWinBack(cid, automation.studio_id).catch(() => {})
        }
      }

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
    } catch (err) {
      console.error(`[cron] automation ${automation.id} failed:`, err)
      results.push(`Automation ${automation.id}: failed`)
    }
  }

  return NextResponse.json({ success: true, results })
}

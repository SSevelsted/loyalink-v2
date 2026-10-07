import { after, NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { AudienceFilter } from '@/types/database'
import { passServiceFetch } from '@/lib/pass-service'
import { verifyStudioAccess } from '@/lib/studio-access'
import { applyContentActions, type ContentAction } from '@/lib/services/campaign-actions-service'
import { campaignFailedCount, campaignSentCount, pushSegmentFilter, resolveCampaignAudienceIds } from '@/lib/campaign-audience'
import { renderFriendGift } from '@/lib/wallet-messages'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyStudioMember(studioId: string) {
  const result = await verifyStudioAccess(studioId)
  if (!result.authorized) return { authorized: false as const, error: result.error }
  return { authorized: true as const }
}

export const maxDuration = 300

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

    const content = (campaign.content || {}) as ContentAction & { header?: string }

    // Render {friend_gift} once for the whole send. Refuse a gift text with no
    // amount before anything is marked as sending or credited.
    let pushMessage: string | undefined
    if (content.announcement?.trim()) {
      const { data: studio } = await supabase.from('studios').select('settings').eq('id', campaign.studio_id).single()
      const rendered = renderFriendGift(content.announcement, (studio?.settings ?? null) as Record<string, unknown> | null)
      if (!rendered.ok) return NextResponse.json({ error: rendered.error }, { status: 400 })
      pushMessage = rendered.text
    }

    // Mark as sending
    await supabase
      .from('push_campaigns')
      .update({ status: 'sending' })
      .eq('id', id)

    // Resolve audience (paged: no 1000-row cap)
    const filter = (campaign.audience_filter || {}) as AudienceFilter
    const customerIds = await resolveCampaignAudienceIds(supabase, campaign.studio_id, campaign.audience_type, filter)
    const audienceCount = customerIds.length

    if (audienceCount === 0) {
      await supabase
        .from('push_campaigns')
        .update({ status: 'completed', audience_count: 0, sent_count: 0, sent_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ success: true, audienceCount: 0 })
    }

    // Apply content actions (add balance, cashback boost, etc.)
    await applyContentActions(customerIds, campaign.studio_id, content, { source: 'campaign' })

    // Fire push via pass service (refreshes passes; the announcement is the
    // notification text on Apple and Google). after() keeps the function alive
    // until pass-service answers, so sent_count is written.
    after(async () => {
      try {
        const res = await passServiceFetch(`/api/push/studio/${campaign.studio_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentFilter: pushSegmentFilter(campaign.audience_type, filter),
            campaignId: id,
            pushMessage,
            pushHeader: content.header || undefined,
          }),
        })
        if (!res.ok) throw new Error(`pass-service ${res.status}`)
        const result = await res.json().catch(() => ({}))
        await supabase
          .from('push_campaigns')
          .update({
            status: 'completed',
            audience_count: audienceCount,
            sent_count: campaignSentCount(result),
            failed_count: campaignFailedCount(result),
            sent_at: new Date().toISOString(),
          })
          .eq('id', id)
      } catch (err) {
        console.error(`[campaign ${id}] push failed:`, err)
        await supabase
          .from('push_campaigns')
          .update({ status: 'failed' })
          .eq('id', id)
      }
    })

    return NextResponse.json({ success: true, audienceCount })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

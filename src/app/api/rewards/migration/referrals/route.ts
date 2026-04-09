import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, getSessionUser, isStudioMember } from '@/lib/studio-access'
import { passServiceFetch } from '@/lib/pass-service'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG } from '@/types/database'
import type { RewardsConfig } from '@/types/database'

type ReferralMigrationRequest = {
  studioId: string
  newConfig: RewardsConfig
  applyFriendRate: boolean
  applyCommissionDuration: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReferralMigrationRequest
    const { studioId, newConfig, applyFriendRate, applyCommissionDuration } = body

    if (!studioId || !newConfig) {
      return NextResponse.json({ error: 'studioId and newConfig are required' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isMember = await isStudioMember(user.id, studioId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current config to find the old friend_tier_slug
    const { data: studio } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single()

    const settings = studio?.settings as Record<string, unknown> | null
    const oldConfig = settings?.rewards_config
      ? migrateRewardsConfig(settings.rewards_config)
      : DEFAULT_REWARDS_CONFIG

    let updatedFriends = 0
    let updatedReferrals = 0

    // 1. Update friend cashback rate for existing referred customers
    if (applyFriendRate && oldConfig.referrals?.friend_tier_slug) {
      const oldFriendSlug = oldConfig.referrals.friend_tier_slug
      const newRate = newConfig.referrals.friend_cashback_rate

      const { data: affected } = await adminSupabase
        .from('customers')
        .update({ cashback_rate: newRate })
        .eq('studio_id', studioId)
        .eq('loyalty_stage', oldFriendSlug)
        .neq('cashback_rate', newRate)
        .select('id')

      updatedFriends = affected?.length ?? 0
    }

    // 2. Recalculate commission_expires_at for activated referrals
    if (applyCommissionDuration) {
      const newDurationDays = newConfig.referrals.referrer_commission_duration_days

      // Fetch all activated referrals for this studio
      const { data: activatedReferrals } = await adminSupabase
        .from('referrals')
        .select('id, activated_at')
        .eq('studio_id', studioId)
        .eq('status', 'activated')

      if (activatedReferrals && activatedReferrals.length > 0) {
        for (const referral of activatedReferrals) {
          if (!referral.activated_at) continue

          const newExpiry =
            newDurationDays === 0
              ? null // unlimited
              : new Date(
                  new Date(referral.activated_at).getTime() + newDurationDays * 24 * 60 * 60 * 1000
                ).toISOString()

          await adminSupabase
            .from('referrals')
            .update({ commission_expires_at: newExpiry })
            .eq('id', referral.id)
        }

        updatedReferrals = activatedReferrals.length
      }
    }

    // 3. Save new config
    const currentSettings = (studio?.settings as Record<string, unknown>) ?? {}
    const { error: saveError } = await adminSupabase
      .from('studios')
      .update({ settings: { ...currentSettings, rewards_config: newConfig } })
      .eq('id', studioId)

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    // 4. Trigger pass updates if friends were updated
    if (updatedFriends > 0) {
      void passServiceFetch(`/api/push/studio/${studioId}`, { method: 'POST' }).catch(() => {})
    }

    return NextResponse.json({ success: true, updatedFriends, updatedReferrals })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

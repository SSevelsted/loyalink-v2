import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'
import { pushStudioPasses } from '@/lib/pass-push'
import { migrateRewardsConfig, syncReferralFriendRate } from '@/types/database'
import { migrateExistingMembers, RewardsMigrationError } from '@/lib/services/rewards-migration-service'
import type { RewardsConfig } from '@/types/database'

type MigrationRequest = {
  studioId: string
  newConfig: RewardsConfig
  mappings: Record<string, string>     // { oldSlug: newSlug }
  applyRateChanges: boolean
  applyToExisting: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MigrationRequest
    const { studioId, newConfig, mappings, applyRateChanges, applyToExisting } = body

    if (!studioId || !newConfig) {
      return NextResponse.json({ error: 'studioId and newConfig are required' }, { status: 400 })
    }

    const normalizedConfig = migrateRewardsConfig(newConfig)

    // Grants access to studio members AND super_admins (who manage any studio).
    const access = await verifyStudioAccess(studioId)
    if (!access.authorized) {
      return access.error
    }

    const newTierMap = new Map(normalizedConfig.tiers.map((t) => [t.slug, t]))
    let migratedMembers = 0
    let migratedPromotions = 0

    if (applyToExisting) {
      try {
        const migrated = await migrateExistingMembers({
          studioId,
          config: normalizedConfig,
          mappings,
          applyRateChanges,
        })
        migratedMembers = migrated.migratedMembers
        migratedPromotions = migrated.migratedPromotions
      } catch (err) {
        if (err instanceof RewardsMigrationError) {
          return NextResponse.json({ error: err.message }, { status: err.status })
        }
        throw err
      }
    }

    // 3. Update referral config if friend_tier_slug was removed
    let finalConfig = syncReferralFriendRate(normalizedConfig)
    if (finalConfig.referrals?.friend_tier_slug) {
      const friendSlug = finalConfig.referrals.friend_tier_slug
      if (!newTierMap.has(friendSlug) && mappings[friendSlug]) {
        finalConfig.referrals = {
          ...finalConfig.referrals,
          friend_tier_slug: mappings[friendSlug],
          friend_cashback_rate: newTierMap.get(mappings[friendSlug])?.cashback_rate ?? finalConfig.referrals.friend_cashback_rate,
        }
      }
    }
    finalConfig = syncReferralFriendRate(finalConfig)

    // 4. Save config (last — so failed migration doesn't leave inconsistent state)
    const { data: studio, error: fetchError } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single()

    if (fetchError) {
      console.error('[rewards/migration] fetch settings error:', fetchError)
      return NextResponse.json({ error: 'Failed to load studio settings' }, { status: 500 })
    }

    const currentSettings = (studio.settings as Record<string, unknown>) ?? {}
    const { error: saveError } = await adminSupabase
      .from('studios')
      .update({ settings: { ...currentSettings, rewards_config: finalConfig } })
      .eq('id', studioId)

    if (saveError) {
      console.error('[rewards/migration] save config error:', saveError)
      return NextResponse.json({ error: 'Failed to save rewards configuration' }, { status: 500 })
    }

    // 5. Trigger batch wallet pass updates
    if (applyToExisting && migratedMembers > 0) {
      pushStudioPasses(studioId)
    }

    return NextResponse.json({ success: true, migratedMembers, migratedPromotions })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

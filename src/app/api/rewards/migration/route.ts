import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, getSessionUser, isStudioMember } from '@/lib/studio-access'
import { passServiceFetch } from '@/lib/pass-service'
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

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isMember = await isStudioMember(user.id, studioId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newTierMap = new Map(newConfig.tiers.map((t) => [t.slug, t]))
    let migratedMembers = 0
    let migratedPromotions = 0

    if (applyToExisting) {
      // 1. Apply tier mappings (removed tiers → new tiers)
      for (const [oldSlug, newSlug] of Object.entries(mappings)) {
        const newTier = newTierMap.get(newSlug)
        if (!newTier) continue

        // Fetch affected customers for analytics logging
        const { data: affected } = await adminSupabase
          .from('customers')
          .select('id, loyalty_stage')
          .eq('studio_id', studioId)
          .eq('loyalty_stage', oldSlug)

        if (affected && affected.length > 0) {
          // Batch update customers
          const { error: updateError } = await adminSupabase
            .from('customers')
            .update({
              loyalty_stage: newSlug,
              cashback_rate: newTier.cashback_rate,
            })
            .eq('studio_id', studioId)
            .eq('loyalty_stage', oldSlug)

          if (updateError) {
            console.error('[rewards/migration] tier update error:', updateError)
            return NextResponse.json({ error: 'Failed to migrate tier. Please try again.' }, { status: 500 })
          }

          migratedMembers += affected.length

          // Log analytics events in chunks
          const events = affected.map((c) => ({
            studio_id: studioId,
            event_type: 'tier_change' as const,
            customer_id: c.id,
            metadata: {
              from_tier: oldSlug,
              to_tier: newSlug,
              to_tier_name: newTier.name,
              cashback_rate: newTier.cashback_rate,
              source: 'migration',
            },
          }))

          for (let i = 0; i < events.length; i += 500) {
            await adminSupabase.from('analytics_events').insert(events.slice(i, i + 500))
          }
        }

        // Update active promotion snapshots
        const { data: promoCount } = await adminSupabase
          .from('member_promotions')
          .update({
            original_tier_slug: newSlug,
            original_cashback_rate: newTier.cashback_rate,
          })
          .eq('original_tier_slug', oldSlug)
          .eq('status', 'active')
          .select('id')

        migratedPromotions += promoCount?.length ?? 0
      }

      // 2. Apply cashback rate changes (same slug, new rate)
      if (applyRateChanges) {
        for (const [slug, tier] of newTierMap) {
          // Only update if this slug was NOT already handled by mappings
          if (Object.values(mappings).includes(slug) && !Object.keys(mappings).includes(slug)) continue

          const { data: rateAffected } = await adminSupabase
            .from('customers')
            .update({ cashback_rate: tier.cashback_rate })
            .eq('studio_id', studioId)
            .eq('loyalty_stage', slug)
            .neq('cashback_rate', tier.cashback_rate)
            .select('id')

          migratedMembers += rateAffected?.length ?? 0

          // Also update promotion snapshots for rate changes
          await adminSupabase
            .from('member_promotions')
            .update({ original_cashback_rate: tier.cashback_rate })
            .eq('original_tier_slug', slug)
            .eq('status', 'active')
        }
      }
    }

    // 3. Update referral config if friend_tier_slug was removed
    const finalConfig = { ...newConfig }
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
      void passServiceFetch(`/api/push/studio/${studioId}`, { method: 'POST' }).catch(() => {})
    }

    return NextResponse.json({ success: true, migratedMembers, migratedPromotions })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

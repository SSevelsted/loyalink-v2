import { adminSupabase } from '@/lib/studio-access'
import type { RewardsConfig } from '@/types/database'

export class RewardsMigrationError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'RewardsMigrationError'
    this.status = status
  }
}

type MigrateExistingMembersInput = {
  studioId: string
  /** The new, normalized rewards config. */
  config: RewardsConfig
  /** Removed tiers → new tiers: { oldSlug: newSlug } */
  mappings: Record<string, string>
  applyRateChanges: boolean
}

/**
 * Move a studio's existing members onto a new rewards config: remapped tiers
 * (removed tier → new tier) and, optionally, new tier rates.
 */
export async function migrateExistingMembers(
  input: MigrateExistingMembersInput,
): Promise<{ migratedMembers: number; migratedPromotions: number }> {
  const { studioId, config, mappings, applyRateChanges } = input
  const newTierMap = new Map(config.tiers.map((t) => [t.slug, t]))
  let migratedMembers = 0
  let migratedPromotions = 0

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
        throw new RewardsMigrationError('Failed to migrate tier. Please try again.', 500)
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

  return { migratedMembers, migratedPromotions }
}

type ApplyFriendRateInput = {
  studioId: string
  /** The friend tier members sit on (the OLD config's friend_tier_slug). */
  friendSlug: string
  /** The new friend cashback rate. */
  rate: number
}

/** Give every member on the friend tier the new friend rate. Returns the members updated. */
export async function applyFriendRateToMembers(input: ApplyFriendRateInput): Promise<number> {
  const { studioId, friendSlug, rate } = input

  const { data: affected } = await adminSupabase
    .from('customers')
    .update({ cashback_rate: rate })
    .eq('studio_id', studioId)
    .eq('loyalty_stage', friendSlug)
    .neq('cashback_rate', rate)
    .select('id')

  return affected?.length ?? 0
}

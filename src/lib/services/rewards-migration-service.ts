import { adminSupabase } from '@/lib/studio-access'
import type { RewardsConfig } from '@/types/database'
import {
  MemberDealError,
  rewriteTierMembers,
  tierChangeMetadata,
  type RewrittenMember,
} from '@/lib/services/member-deal-service'

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

async function rewrite(input: Parameters<typeof rewriteTierMembers>[0]) {
  try {
    return await rewriteTierMembers(input)
  } catch (err) {
    if (err instanceof MemberDealError) {
      console.error('[rewards/migration] member update error:', err.message)
      throw new RewardsMigrationError('Failed to migrate tier. Please try again.', 500)
    }
    throw err
  }
}

/**
 * Move a studio's existing members onto a new rewards config: remapped tiers
 * (removed tier → new tier) and, optionally, new tier rates.
 *
 * Only this studio's members and promotions move. A member with an active
 * promotion keeps it as the main deal: the change lands in the promotion's
 * fallback, and the row shows the best deal (see member-deal-service).
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

    const result = await rewrite({ studioId, tiers: config.tiers, fromSlug: oldSlug, toSlug: newSlug, rate: newTier.cashback_rate })
    migratedMembers += result.members.length
    migratedPromotions += result.promotionsUpdated
    await logTierChanges(studioId, result.members, config)
  }

  // 2. Apply cashback rate changes (same slug, new rate)
  if (applyRateChanges) {
    for (const [slug, tier] of newTierMap) {
      // Only update if this slug was NOT already handled by mappings
      if (Object.values(mappings).includes(slug) && !Object.keys(mappings).includes(slug)) continue

      const result = await rewrite({ studioId, tiers: config.tiers, fromSlug: slug, rate: tier.cashback_rate })
      migratedMembers += result.members.length
      migratedPromotions += result.promotionsUpdated
    }
  }

  return { migratedMembers, migratedPromotions }
}

/** tier_change events for remapped members. A failed insert is logged: the members already moved. */
async function logTierChanges(studioId: string, members: RewrittenMember[], config: RewardsConfig) {
  const events = members
    .filter((m) => m.tier_slug !== m.previous_tier_slug)
    .map((m) => ({
      studio_id: studioId,
      event_type: 'tier_change' as const,
      customer_id: m.customer_id,
      metadata: tierChangeMetadata(m, config, 'migration'),
    }))

  for (let i = 0; i < events.length; i += 500) {
    const { error } = await adminSupabase.from('analytics_events').insert(events.slice(i, i + 500))
    if (error) console.error('[rewards/migration] tier_change events failed to save:', error.message)
  }
}

type ApplyFriendRateInput = {
  studioId: string
  /** The rewards config being saved: override rates and best deal read its tiers. */
  config: RewardsConfig
  /** The friend tier members sit on (the OLD config's friend_tier_slug). */
  friendSlug: string
  /** The new friend cashback rate. */
  rate: number
}

/**
 * Give every member of the studio on the friend tier the new friend rate.
 * During a promotion it lands in the promotion's fallback. Returns the members
 * whose rate changed.
 */
export async function applyFriendRateToMembers(input: ApplyFriendRateInput): Promise<number> {
  const { studioId, config, friendSlug, rate } = input
  const result = await rewrite({ studioId, tiers: config.tiers, fromSlug: friendSlug, rate })
  return result.members.length
}

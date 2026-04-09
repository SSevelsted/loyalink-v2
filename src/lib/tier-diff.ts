import type { RewardsConfig, TierConfig } from '@/types/database'

export type TierDiff = {
  removedTiers: TierConfig[]
  rateChangedTiers: Array<{
    slug: string
    name: string
    oldRate: number
    newRate: number
  }>
  addedTiers: TierConfig[]
  requiresMigration: boolean
}

export function computeTierDiff(oldConfig: RewardsConfig, newConfig: RewardsConfig): TierDiff {
  const oldMap = new Map(oldConfig.tiers.map((t) => [t.slug, t]))
  const newMap = new Map(newConfig.tiers.map((t) => [t.slug, t]))

  const removedTiers: TierConfig[] = []
  const rateChangedTiers: TierDiff['rateChangedTiers'] = []
  const addedTiers: TierConfig[] = []

  for (const [slug, tier] of oldMap) {
    const newTier = newMap.get(slug)
    if (!newTier) {
      removedTiers.push(tier)
    } else if (newTier.cashback_rate !== tier.cashback_rate) {
      rateChangedTiers.push({
        slug,
        name: newTier.name,
        oldRate: tier.cashback_rate,
        newRate: newTier.cashback_rate,
      })
    }
  }

  for (const [slug, tier] of newMap) {
    if (!oldMap.has(slug)) {
      addedTiers.push(tier)
    }
  }

  return {
    removedTiers,
    rateChangedTiers,
    addedTiers,
    requiresMigration: removedTiers.length > 0 || rateChangedTiers.length > 0,
  }
}

/** For a removed tier, find the new tier with the closest cashback rate */
export function findClosestTier(removedTier: TierConfig, newTiers: TierConfig[]): string {
  if (newTiers.length === 0) return ''

  let closest = newTiers[0]
  let minDiff = Math.abs(newTiers[0].cashback_rate - removedTier.cashback_rate)

  for (let i = 1; i < newTiers.length; i++) {
    const diff = Math.abs(newTiers[i].cashback_rate - removedTier.cashback_rate)
    if (diff < minDiff) {
      minDiff = diff
      closest = newTiers[i]
    }
  }

  return closest.slug
}

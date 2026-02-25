import type { RewardsConfig, UpgradeTriggerConfig } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

/**
 * Format a phone number string by inserting spaces every 2 digits.
 * Strips non-digit characters before formatting.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

/**
 * Resolve a loyalty_stage slug to its display name from the rewards config.
 * If the slug doesn't match any current tier (e.g. legacy "bronze"), falls back
 * to the first (base) tier's name so stale data still displays correctly.
 */
export function getTierDisplayName(slug: string, config?: RewardsConfig): string {
  if (config) {
    const tier = config.tiers.find((t) => t.slug === slug)
    if (tier) return tier.name
    // Legacy slug — show as base tier
    if (config.tiers.length > 0) return config.tiers[0].name
  }
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Resolve a potentially-legacy tier slug to the effective slug in the current config.
 * If the slug doesn't match any tier, returns the first (base) tier slug.
 */
export function getEffectiveTierSlug(slug: string, config?: RewardsConfig): string {
  if (!config || config.tiers.length === 0) return slug
  const match = config.tiers.find((t) => t.slug === slug)
  return match ? match.slug : config.tiers[0].slug
}

/**
 * Get the index of a tier slug in the rewards config (for color palette mapping).
 * Returns 0 if not found (legacy slugs map to base tier).
 */
export function getTierIndex(slug: string, config?: RewardsConfig): number {
  if (!config) return 0
  const idx = config.tiers.findIndex((t) => t.slug === slug)
  return idx >= 0 ? idx : 0
}

/** Friendly display names for transaction types */
export const TRANSACTION_LABELS: Record<string, string> = {
  credit: 'Purchase Recorded',
  debit: 'Balance Redeemed',
  adjustment: 'Balance Adjustment',
  cashback: 'Cashback Earned',
  referral_commission: 'Referral Bonus',
}

/** Manual transaction type definitions with labels and descriptions */
export const MANUAL_TRANSACTION_TYPES = [
  {
    value: 'credit',
    label: 'Record Purchase',
    description: 'Customer paid — adds cashback to their balance',
  },
  {
    value: 'debit',
    label: 'Redeem Balance',
    description: 'Customer uses their credit — subtracts from balance',
  },
  {
    value: 'adjustment',
    label: 'Balance Adjustment',
    description: 'Manual correction — add or remove balance',
  },
] as const

/**
 * Customer-facing display text for tier upgrade triggers.
 */
export function getTriggerDisplayText(trigger: UpgradeTriggerConfig, currency: string): string {
  const cfg = getCurrencyConfig(currency)
  switch (trigger.type) {
    case 'first_purchase':
      return 'After your first purchase'
    case 'first_full_payment':
      return 'After your first full payment'
    case 'total_spend':
      return `Spend ${formatAmount(trigger.threshold ?? 0, cfg)} total`
    case 'referral_count': {
      const n = trigger.threshold ?? 1
      return n === 1 ? 'Refer 1 friend' : `Refer ${n} friends`
    }
    case 'days_member': {
      const d = trigger.threshold ?? 30
      return `After ${d} days as a member`
    }
    default:
      return ''
  }
}

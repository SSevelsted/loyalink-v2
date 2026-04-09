import type { RewardsConfig } from '@/types/database'

/**
 * StreamInk-specific rewards configuration.
 * Used only when creating studios via the v1 API (source: 'streamink').
 * NOT visible in the Loyalink UI or available to regular signups.
 */

export const STREAMINK_REWARDS_CONFIG: RewardsConfig = {
  enabled: true,
  tiers: [
    {
      slug: 'base',
      name: 'Base',
      cashback_rate: 7.5,
      unlocks_referrals: true,
    },
    {
      slug: 'loyalty_club',
      name: 'Loyalty Club',
      cashback_rate: 15,
      upgrade_trigger: { type: 'first_full_payment' },
      unlocks_referrals: false,
    },
    {
      slug: 'inner_circle',
      name: 'Inner Circle',
      cashback_rate: 20,
      // No automatic upgrade — reached only via promotions
      upgrade_trigger: { type: 'total_spend', threshold: 999999 },
      unlocks_referrals: false,
    },
  ],
  referrals: {
    enabled: true,
    referrer_commission_rate: 5,
    referrer_commission_type: 'percentage',
    referrer_commission_duration_days: 60,
    referrer_cashback_bonus_per_ref: 2.5,
    referrer_cashback_cap: 25,
    // Friend starts in Loyalty Club at 15%
    friend_tier_slug: 'loyalty_club',
    friend_cashback_rate: 15,
    // Welcome bonus set per-currency at studio creation time
    friend_welcome_bonus: 100,
    // Referral activates when the referred lead pays a deposit
    activation_trigger: { type: 'first_purchase' },
  },
  cashback_on_cashback_balance: false,
}

/**
 * Welcome bonus amounts by currency.
 * €15 / 100 DKK / 150 SEK / 150 NOK
 */
export const STREAMINK_WELCOME_BONUS: Record<string, number> = {
  EUR: 15,
  DKK: 100,
  SEK: 150,
  NOK: 150,
  USD: 15,
  GBP: 13,
}

/**
 * Tier themes for StreamInk studios.
 * Minimal defaults — design is done manually per studio.
 */
export const STREAMINK_TIER_THEMES = {
  base: {
    name: 'Base',
    backgroundColor: '#F5F0EB',
    foregroundColor: '#2D2A26',
    labelColor: '#8A857F',
    stripImage: null,
    logoOverride: null,
    sortOrder: 0,
  },
  loyalty_club: {
    name: 'Loyalty Club',
    backgroundColor: '#1A1A2E',
    foregroundColor: '#EAEAEA',
    labelColor: '#8888AA',
    stripImage: null,
    logoOverride: null,
    sortOrder: 1,
  },
  inner_circle: {
    name: 'Inner Circle',
    backgroundColor: '#0F0F0F',
    foregroundColor: '#D4AF37',
    labelColor: '#888888',
    stripImage: null,
    logoOverride: null,
    sortOrder: 2,
  },
}

/**
 * Default promotion templates auto-created for StreamInk studios.
 */
export const STREAMINK_PROMOTIONS = [
  {
    name: 'Cashback Boost (20% next transaction)',
    type: 'cashback_boost' as const,
    cashback_rate: 20,
    tier_slug: null,
    duration_type: 'transactions' as const,
    duration_value: 1,
  },
  {
    name: 'Inner Circle (1 year)',
    type: 'tier_override' as const,
    cashback_rate: null,
    tier_slug: 'inner_circle',
    duration_type: 'days' as const,
    duration_value: 365,
  },
]

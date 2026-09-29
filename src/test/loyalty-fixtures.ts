// Seed rows for the loyalty service tests (see fake-supabase.ts).
import type { Row } from './fake-supabase'

export const STUDIO_ID = 'studio-a'
export const OTHER_STUDIO_ID = 'studio-b'

// Every tier after the base spells out its trigger: migrateRewardsConfig fills
// a missing field from DEFAULT_REWARDS_CONFIG's tier at the same index.
export const REWARDS_CONFIG = {
  enabled: true,
  tiers: [
    { slug: 'base', name: 'Base', cashback_rate: 7.5, unlocks_referrals: true },
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
      upgrade_trigger: { type: 'total_spend', threshold: 50000 },
      unlocks_referrals: false,
    },
  ],
  referrals: {
    enabled: true,
    referrer_commission_rate: 0,
    referrer_commission_type: 'percentage',
    referrer_commission_duration_days: 60,
    referrer_cashback_bonus_per_ref: 2.5,
    referrer_cashback_cap: 20,
    friend_tier_slug: 'base',
    friend_cashback_rate: 7.5,
    friend_welcome_bonus: 0,
    activation_trigger: { type: 'first_purchase' },
  },
  cashback_on_cashback_balance: false,
}

export function studioRow(id: string, rewardsConfig: unknown = REWARDS_CONFIG): Row {
  return { id, name: id, is_agency: false, settings: { rewards_config: rewardsConfig, language: 'en', currency: 'DKK' } }
}

export function customerRow(id: string, fields: Row = {}): Row {
  return {
    id,
    studio_id: STUDIO_ID,
    name: id,
    email: null,
    phone: null,
    member_id: null,
    contact_id: null,
    loyalty_stage: 'base',
    cashback_rate: 7.5,
    balance: 0,
    total_real_spend: 0,
    has_purchased: true,
    referral_count: 0,
    referral_code: null,
    currency: 'DKK',
    language: 'en',
    tags: [],
    metadata: {},
    pass_provider: null,
    landing_page_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...fields,
  }
}

type PromotionFields = {
  studio_id?: string
  type: 'cashback_boost' | 'tier_override'
  cashback_rate?: number | null
  tier_slug?: string | null
  original_tier_slug: string
  original_cashback_rate: number
  remaining_transactions?: number | null
  expires_at?: string | null
  status?: 'active' | 'expired' | 'revoked'
}

export function promotionRow(id: string, customerId: string, fields: PromotionFields): Row {
  return {
    id,
    studio_id: STUDIO_ID,
    customer_id: customerId,
    promotion_id: null,
    cashback_rate: null,
    tier_slug: null,
    remaining_transactions: null,
    expires_at: null,
    status: 'active',
    applied_by: 'test',
    expired_at: null,
    created_at: '2026-09-01T00:00:00.000Z',
    ...fields,
  }
}

import type { RewardsConfig } from '@/types/database'
import { DEFAULT_REWARDS_CONFIG } from '@/types/database'

export type TemplateId = 'simple' | 'classic' | 'prestige' | 'custom'

export type RewardTemplate = {
  id: TemplateId
  name: string
  tagline: string
  tierCount: number
  cashbackRange: string
  config: RewardsConfig
}

const SIMPLE_START: RewardsConfig = {
  enabled: true,
  tiers: [
    {
      slug: 'member',
      name: 'Member',
      cashback_rate: 5,
      unlocks_referrals: true,
    },
    {
      slug: 'vip',
      name: 'VIP',
      cashback_rate: 10,
      upgrade_trigger: { type: 'first_full_payment' },
      unlocks_referrals: false,
    },
  ],
  referrals: {
    enabled: true,
    referrer_commission_rate: 5,
    referrer_commission_type: 'percentage',
    referrer_commission_duration_days: 60,
    referrer_cashback_bonus_per_ref: 1,
    referrer_cashback_cap: 10,
    friend_tier_slug: 'vip',
    friend_cashback_rate: 10,
    friend_welcome_bonus: 50,
    activation_trigger: { type: 'first_purchase' },
  },
  cashback_on_cashback_balance: false,
}

const CLASSIC: RewardsConfig = {
  enabled: true,
  tiers: [
    {
      slug: 'starter',
      name: 'Starter',
      cashback_rate: 7,
      unlocks_referrals: true,
    },
    {
      slug: 'member',
      name: 'Member',
      cashback_rate: 12,
      upgrade_trigger: { type: 'first_full_payment' },
      unlocks_referrals: false,
    },
    {
      slug: 'loyal',
      name: 'Loyal',
      cashback_rate: 18,
      upgrade_trigger: { type: 'total_spend', threshold: 10000 },
      unlocks_referrals: false,
    },
  ],
  referrals: {
    enabled: true,
    referrer_commission_rate: 5,
    referrer_commission_type: 'percentage',
    referrer_commission_duration_days: 60,
    referrer_cashback_bonus_per_ref: 2,
    referrer_cashback_cap: 15,
    friend_tier_slug: 'member',
    friend_cashback_rate: 12,
    friend_welcome_bonus: 75,
    activation_trigger: { type: 'first_purchase' },
  },
  cashback_on_cashback_balance: false,
}

export const REWARD_TEMPLATES: RewardTemplate[] = [
  {
    id: 'simple',
    name: 'Simple Start',
    tagline: 'Two tiers, clean and simple. Your customers earn, your business grows.',
    tierCount: 2,
    cashbackRange: '5–10%',
    config: SIMPLE_START,
  },
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Three tiers, proven rewards, and a referral boost. Works for most service businesses.',
    tierCount: 3,
    cashbackRange: '7–18%',
    config: CLASSIC,
  },
  {
    id: 'prestige',
    name: 'Prestige',
    tagline: 'Four tiers, referral engine, maximum retention. This is what our top-performing studios use.',
    tierCount: 4,
    cashbackRange: '7.5–20%',
    config: DEFAULT_REWARDS_CONFIG,
  },
  {
    id: 'custom',
    name: 'Custom',
    tagline: 'Start from scratch and build exactly what you want.',
    tierCount: 0,
    cashbackRange: 'You decide',
    config: DEFAULT_REWARDS_CONFIG,
  },
]

export const DEFAULT_TEMPLATE_ID: TemplateId = 'classic'

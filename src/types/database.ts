export type PreExistingClient = {
  id: string
  studio_id: string
  email: string | null
  phone: string | null
  name: string | null
  created_at: string
}

export type Studio = {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
  // Billing
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'agency' | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  is_agency: boolean
  created_at: string
  updated_at: string
}

export type StudioMember = {
  id: string
  studio_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'super_admin'
  joined_at: string
}

export type Invitation = {
  id: string
  studio_id: string
  email: string
  role: 'owner' | 'admin' | 'member'
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export type Customer = {
  id: string
  studio_id: string
  name: string
  email: string | null
  phone: string | null
  contact_id: string | null
  member_id: string | null
  balance: number
  cashback_rate: number | null
  loyalty_stage: string
  tags: string[]
  pass_provider: string
  referral_code: string | null
  referral_count: number
  has_purchased: boolean
  total_real_spend: number
  // Market: native currency + language + originating landing page, locked at signup.
  // Nullable — fall back to studio currency/language at render time when unset.
  currency: string | null
  language: string | null
  landing_page_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type LegacyLoyaltyLink = {
  id: string
  studio_id: string
  customer_id: string
  provider: string
  legacy_project: string
  legacy_studio_id: string
  legacy_customer_id: string | null
  legacy_member_id: string
  legacy_passkit_id: string | null
  legacy_barcode_payload: string | null
  legacy_payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  customer_id: string
  studio_id: string
  type: 'credit' | 'debit' | 'adjustment' | 'cashback' | 'referral_commission'
  amount: number
  description: string | null
  created_by: string | null
  source_customer_id: string | null
  created_at: string
}

export type PassTemplate = {
  id: string
  studio_id: string
  name: string
  is_active: boolean
  logo_url: string | null
  icon_url: string | null
  tier_themes: Record<string, unknown>
  card_fields: unknown[]
  static_texts: Record<string, unknown>
  barcode_format: string
  created_at: string
  updated_at: string
}

export type WalletPass = {
  id: string
  customer_id: string
  studio_id: string
  template_id: string | null
  serial_number: string
  authentication_token: string
  platform: 'apple' | 'google'
  version: number
  status: 'active' | 'installed' | 'uninstalled' | 'voided' | 'expired'
  created_at: string
  updated_at: string
}

export type WalletDeviceRegistration = {
  id: string
  device_library_identifier: string
  push_token: string
  platform: string
  serial_number: string
  is_active: boolean
  created_at: string
}

export type CustomerEvent = {
  id: string
  studio_id: string
  event_type: string
  customer_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type WalletPushLog = {
  id: string
  studio_id: string
  target_type: 'all' | 'customer' | 'tier'
  customer_id: string | null
  message_type: string | null
  total_devices: number
  sent_count: number
  failed_count: number
  status: 'pending' | 'sending' | 'completed' | 'failed'
  campaign_id: string | null
  automation_id: string | null
  created_at: string
}

export type StudioLandingPage = {
  id: string
  studio_id: string
  slug: string
  headline: string | null
  description: string | null
  hero_image_url: string | null
  settings: Record<string, unknown>
  view_count: number
  signup_count: number
  created_at: string
  updated_at: string
}

export type Promotion = {
  id: string
  studio_id: string
  name: string
  type: 'cashback_boost' | 'tier_override'
  cashback_rate: number | null
  tier_slug: string | null
  duration_type: 'transactions' | 'days' | 'unlimited'
  duration_value: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MemberPromotion = {
  id: string
  studio_id: string
  customer_id: string
  promotion_id: string | null
  type: 'cashback_boost' | 'tier_override'
  cashback_rate: number | null
  tier_slug: string | null
  original_tier_slug: string
  original_cashback_rate: number
  remaining_transactions: number | null
  expires_at: string | null
  status: 'active' | 'expired' | 'revoked'
  applied_by: string | null
  created_at: string
  expired_at: string | null
}

export type ApiKey = {
  id: string
  studio_id: string
  key_hash: string
  name: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export type AnalyticsEvent = {
  id: string
  studio_id: string
  event_type: string
  customer_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type TierTheme = {
  name: string
  backgroundColor: string
  foregroundColor: string
  labelColor: string
  stripImage: string | null
  logoOverride: string | null
  sortOrder: number
}

export type CardField = {
  key: string
  label: string
  value: string
}

export const DEFAULT_TIER_THEMES: Record<string, TierTheme> = {
  // Classic template tiers
  starter: {
    name: 'Starter',
    backgroundColor: '#FAFAF9',
    foregroundColor: '#1C1917',
    labelColor: '#A8A29E',
    stripImage: null,
    logoOverride: null,
    sortOrder: 0,
  },
  member: {
    name: 'Member',
    backgroundColor: '#B8B8BD',
    foregroundColor: '#18181B',
    labelColor: '#52525B',
    stripImage: null,
    logoOverride: null,
    sortOrder: 1,
  },
  loyal: {
    name: 'Loyal',
    backgroundColor: '#09090B',
    foregroundColor: '#FAFAFA',
    labelColor: '#71717A',
    stripImage: null,
    logoOverride: null,
    sortOrder: 2,
  },
  // Simple Start template tiers
  vip: {
    name: 'VIP',
    backgroundColor: '#D4AF37',
    foregroundColor: '#1A1A1A',
    labelColor: '#4A3B00',
    stripImage: null,
    logoOverride: null,
    sortOrder: 1,
  },
  // Prestige template tiers (DEFAULT_REWARDS_CONFIG)
  silver: {
    name: 'Base (Silver)',
    backgroundColor: '#F5F0EB',
    foregroundColor: '#2D2A26',
    labelColor: '#8A857F',
    stripImage: null,
    logoOverride: null,
    sortOrder: 0,
  },
  gold: {
    name: 'Loyalty Club (Gold)',
    backgroundColor: '#D4AF37',
    foregroundColor: '#1A1A1A',
    labelColor: '#4A3B00',
    stripImage: null,
    logoOverride: null,
    sortOrder: 1,
  },
  black: {
    name: 'Referrals (Black)',
    backgroundColor: '#0F0F0F',
    foregroundColor: '#FFFFFF',
    labelColor: '#888888',
    stripImage: null,
    logoOverride: null,
    sortOrder: 2,
  },
  platinum: {
    name: 'Platinum',
    backgroundColor: '#1B2A4A',
    foregroundColor: '#E8ECF1',
    labelColor: '#8096B8',
    stripImage: null,
    logoOverride: null,
    sortOrder: 3,
  },
}

export const DEFAULT_CARD_FIELDS: CardField[] = [
  { key: 'member', label: 'MEMBER', value: '[displayName]' },
  { key: 'balance', label: 'BALANCE', value: '[balance]' },
  { key: 'tier', label: 'TIER', value: '[name]' },
  { key: 'cashback', label: 'Loyalty Cash Back Deal', value: '[cashbackRate]%' },
]

export const DEFAULT_STATIC_TEXTS = {
  referralText: 'Refer Friends. Both Earn Cashback.',
  howItWorks: '1. Scan. Earn. Repeat...',
  personalAnnouncement: '[personalAnnouncement]',
  announcement: '[announcement]',
}

// ── Notifications & Campaigns ──

export type AudienceFilter = {
  loyalty_stages?: string[]
  tags?: string[]
  min_balance?: number
  min_spend?: number
  has_purchased?: boolean
  joined_after?: string
  joined_before?: string
  metadata_filters?: Array<{ key: string; op: 'exists' | 'eq'; value?: unknown }>
  customer_ids?: string[]
}

export type PushCampaign = {
  id: string
  studio_id: string
  name: string
  channel: string
  audience_type: 'all' | 'segment' | 'customers'
  audience_filter: AudienceFilter
  content: Record<string, unknown>
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled'
  scheduled_at: string | null
  sent_at: string | null
  audience_count: number
  sent_count: number
  failed_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AutomationTriggerType =
  | 'days_since_join'
  | 'days_inactive'
  | 'birthday'
  | 'balance_threshold'
  | 'tier_change'
  | 'tag_added'

export type PushAutomation = {
  id: string
  studio_id: string
  name: string
  channel: string
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, unknown>
  audience_filter: AudienceFilter
  content: Record<string, unknown>
  is_enabled: boolean
  last_run_at: string | null
  run_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PushAutomationLog = {
  id: string
  automation_id: string
  studio_id: string
  customer_id: string | null
  status: string
  created_at: string
}

export type Referral = {
  id: string
  studio_id: string
  referrer_customer_id: string
  referred_customer_id: string
  referral_code: string
  status: 'pending' | 'activated' | 'expired'
  activated_at: string | null
  commission_expires_at: string | null
  total_commission_earned: number
  created_at: string
}

export type UpgradeTrigger = 'first_purchase' | 'first_full_payment' | 'total_spend' | 'referral_count' | 'days_member'

export type UpgradeTriggerConfig = {
  type: UpgradeTrigger
  threshold?: number
}

export type TierConfig = {
  slug: string
  name: string
  cashback_rate: number
  upgrade_trigger?: UpgradeTriggerConfig  // undefined for base tier
  unlocks_referrals: boolean
}

export type RewardsConfig = {
  enabled: boolean
  tiers: TierConfig[]  // index 0 = base (no trigger), ordered
  referrals: {
    enabled: boolean
    referrer_commission_rate: number
    referrer_commission_type: 'percentage' | 'fixed'
    referrer_commission_duration_days: number  // 0 = unlimited
    referrer_cashback_bonus_per_ref: number
    referrer_cashback_cap: number
    friend_tier_slug: string
    friend_cashback_rate: number
    friend_welcome_bonus: number
    activation_trigger: UpgradeTriggerConfig
  }
  cashback_on_cashback_balance: boolean
}

export const MAX_TIERS = 6

export const DEFAULT_REWARDS_CONFIG: RewardsConfig = {
  enabled: true,
  tiers: [
    { slug: 'silver', name: 'Base (Silver)', cashback_rate: 7.5, unlocks_referrals: true },
    { slug: 'gold', name: 'Loyalty Club (Gold)', cashback_rate: 15, upgrade_trigger: { type: 'first_full_payment' }, unlocks_referrals: false },
    { slug: 'black', name: 'Referrals (Black)', cashback_rate: 17.5, upgrade_trigger: { type: 'referral_count', threshold: 1 }, unlocks_referrals: false },
    { slug: 'platinum', name: 'Platinum', cashback_rate: 20, upgrade_trigger: { type: 'total_spend', threshold: 25000 }, unlocks_referrals: false },
  ],
  referrals: {
    enabled: true,
    referrer_commission_rate: 5,
    referrer_commission_type: 'percentage',
    referrer_commission_duration_days: 60,
    referrer_cashback_bonus_per_ref: 2.5,
    referrer_cashback_cap: 20,
    friend_tier_slug: 'gold',
    friend_cashback_rate: 15,
    friend_welcome_bonus: 100,
    activation_trigger: { type: 'first_purchase' },
  },
  cashback_on_cashback_balance: false,
}

export const TIER_COLOR_PALETTE = [
  { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-400', dot: 'bg-blue-400', input: 'bg-blue-500/10 border-blue-500/20 text-blue-400', hex: '#3B82F6' },
  { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400', dot: 'bg-emerald-400', input: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', hex: '#10B981' },
  { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-400', dot: 'bg-amber-400', input: 'bg-amber-500/10 border-amber-500/20 text-amber-400', hex: '#F59E0B' },
  { border: 'border-rose-500/20', bg: 'bg-rose-500/5', text: 'text-rose-400', dot: 'bg-rose-400', input: 'bg-rose-500/10 border-rose-500/20 text-rose-400', hex: '#F43F5E' },
  { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', text: 'text-cyan-400', dot: 'bg-cyan-400', input: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', hex: '#06B6D4' },
  { border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', text: 'text-indigo-400', dot: 'bg-indigo-400', input: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', hex: '#6366F1' },
] as const

export const REFERRAL_COLOR = { border: 'border-violet-500/20', bg: 'bg-violet-500/5', text: 'text-violet-400', dot: 'bg-violet-400', input: 'bg-violet-500/10 border-violet-500/20 text-violet-400' } as const

// ── Support Tickets ──

export type SupportTicketCategory = 'bug' | 'billing' | 'feature_request' | 'question' | 'other'
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'

export type SupportTicket = {
  id: string
  studio_id: string
  created_by: string
  title: string
  description: string
  category: SupportTicketCategory
  priority: SupportTicketPriority
  status: SupportTicketStatus
  assigned_to: string | null
  resolved_at: string | null
  attachment_url: string | null
  created_at: string
  updated_at: string
}

export type SupportTicketMessage = {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  is_internal: boolean
  created_at: string
}

/** Migrate old RewardsConfig formats to current V2 tiers[] shape */
export function migrateRewardsConfig(raw: unknown): RewardsConfig {
  const obj = raw as Record<string, unknown>
  if (!obj || typeof obj !== 'object') return DEFAULT_REWARDS_CONFIG

  // V2 format — already has tiers[]
  if (Array.isArray(obj.tiers)) {
    const config = { ...DEFAULT_REWARDS_CONFIG, ...obj } as RewardsConfig

    // Ensure tiers have all required fields
    config.tiers = config.tiers.map((t, i) => ({
      ...DEFAULT_REWARDS_CONFIG.tiers[i] ?? { slug: t.slug, name: t.name ?? t.slug, cashback_rate: 7.5, unlocks_referrals: false },
      ...t,
    }))

    // Migrate string triggers inside tiers
    for (const tier of config.tiers) {
      if (typeof tier.upgrade_trigger === 'string') {
        tier.upgrade_trigger = { type: tier.upgrade_trigger as UpgradeTrigger }
      }
    }

    // Migrate referrals.activation_trigger
    if (typeof (config.referrals as Record<string, unknown>)?.activation_trigger === 'string') {
      config.referrals = {
        ...config.referrals,
        activation_trigger: { type: (config.referrals as Record<string, unknown>).activation_trigger as UpgradeTrigger },
      }
    }

    return config
  }

  // V1 format — has base_cashback_rate + loyalty_upgrade
  if ('base_cashback_rate' in obj || 'loyalty_upgrade' in obj) {
    const v1 = obj as Record<string, unknown> & {
      base_cashback_rate?: number
      base_tier_slug?: string
      loyalty_upgrade?: {
        enabled?: boolean
        trigger?: UpgradeTriggerConfig | string
        tier_slug?: string
        cashback_rate?: number
        unlocks_referrals?: boolean
      }
      referrals?: RewardsConfig['referrals'] & { activation_trigger?: UpgradeTriggerConfig | string }
    }

    const tiers: TierConfig[] = [
      {
        slug: v1.base_tier_slug ?? 'base',
        name: 'Base',
        cashback_rate: v1.base_cashback_rate ?? 7.5,
        unlocks_referrals: false,
      },
    ]

    if (v1.loyalty_upgrade?.enabled !== false) {
      const trigger = typeof v1.loyalty_upgrade?.trigger === 'string'
        ? { type: v1.loyalty_upgrade.trigger as UpgradeTrigger }
        : (v1.loyalty_upgrade?.trigger ?? { type: 'first_purchase' as UpgradeTrigger })
      tiers.push({
        slug: v1.loyalty_upgrade?.tier_slug ?? 'loyalty_club',
        name: 'Loyalty Club',
        cashback_rate: v1.loyalty_upgrade?.cashback_rate ?? 15,
        upgrade_trigger: trigger,
        unlocks_referrals: v1.loyalty_upgrade?.unlocks_referrals ?? true,
      })
    }

    const referrals = { ...DEFAULT_REWARDS_CONFIG.referrals, ...(v1.referrals ?? {}) }
    if (typeof (referrals as Record<string, unknown>).activation_trigger === 'string') {
      referrals.activation_trigger = { type: (referrals as Record<string, unknown>).activation_trigger as UpgradeTrigger }
    }

    return {
      enabled: (v1.enabled as boolean) ?? true,
      tiers,
      referrals,
      cashback_on_cashback_balance: (v1.cashback_on_cashback_balance as boolean) ?? false,
    }
  }

  return DEFAULT_REWARDS_CONFIG
}

/** Return the tier slugs that are actually active based on the rewards config */
export function getActiveTierSlugs(config: RewardsConfig): string[] {
  const slugs = new Set<string>()
  for (const tier of config.tiers) {
    slugs.add(tier.slug)
  }
  if (config.referrals.enabled) slugs.add(config.referrals.friend_tier_slug)
  return Array.from(slugs)
}

/** Get the base (first) tier */
export function getBaseTier(config: RewardsConfig): TierConfig {
  return config.tiers[0] ?? DEFAULT_REWARDS_CONFIG.tiers[0]
}

/** Get the first tier that unlocks referrals */
export function getReferralUnlockTier(config: RewardsConfig): TierConfig | undefined {
  return config.tiers.find(t => t.unlocks_referrals)
}

/** Compute the step-by-step referral cashback progression milestones */
export function computeReferralMilestones(config: RewardsConfig): Array<{ friends: number; rate: number }> {
  const unlockTier = getReferralUnlockTier(config)
  if (!unlockTier || !config.referrals.enabled) return []
  const baseRate = unlockTier.cashback_rate
  const bonus = config.referrals.referrer_cashback_bonus_per_ref
  const cap = config.referrals.referrer_cashback_cap
  if (bonus <= 0) return [{ friends: 0, rate: baseRate }]
  const milestones: Array<{ friends: number; rate: number }> = []
  milestones.push({ friends: 0, rate: baseRate })
  let current = baseRate
  let friends = 0
  while (current < cap && friends < 20) {
    friends++
    current = Math.min(baseRate + bonus * friends, cap)
    milestones.push({ friends, rate: current })
    if (current >= cap) break
  }
  return milestones
}

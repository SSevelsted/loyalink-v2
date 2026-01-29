export type Studio = {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
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
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  customer_id: string
  studio_id: string
  type: 'credit' | 'debit' | 'adjustment' | 'cashback'
  amount: number
  description: string | null
  created_by: string | null
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
  status: 'active' | 'voided' | 'expired'
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

export type CashbackTier = {
  id: string
  studio_id: string
  name: string
  min_spend: number
  cashback_rate: number
  sort_order: number
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
  cashbackRate: number
  minSpend: number
  sortOrder: number
}

export type CardField = {
  key: string
  label: string
  value: string
}

export const DEFAULT_TIER_THEMES: Record<string, TierTheme> = {
  base: {
    name: 'Base',
    backgroundColor: '#FFFFFF',
    foregroundColor: '#000000',
    labelColor: '#666666',
    stripImage: null,
    logoOverride: null,
    cashbackRate: 0,
    minSpend: 0,
    sortOrder: 0,
  },
  loyalty_club: {
    name: 'Loyalty Club',
    backgroundColor: '#1A1A1A',
    foregroundColor: '#FFFFFF',
    labelColor: '#AAAAAA',
    stripImage: null,
    logoOverride: null,
    cashbackRate: 5,
    minSpend: 100,
    sortOrder: 1,
  },
  referral_1: {
    name: 'Referral Bronze',
    backgroundColor: '#F5A623',
    foregroundColor: '#FFFFFF',
    labelColor: '#FFF5E0',
    stripImage: null,
    logoOverride: null,
    cashbackRate: 3,
    minSpend: 0,
    sortOrder: 2,
  },
  referral_2: {
    name: 'Referral Silver',
    backgroundColor: '#C0C0C0',
    foregroundColor: '#1A1A1A',
    labelColor: '#444444',
    stripImage: null,
    logoOverride: null,
    cashbackRate: 5,
    minSpend: 0,
    sortOrder: 3,
  },
  referral_3: {
    name: 'Referral Gold',
    backgroundColor: '#FFD700',
    foregroundColor: '#1A1A1A',
    labelColor: '#444444',
    stripImage: null,
    logoOverride: null,
    cashbackRate: 8,
    minSpend: 0,
    sortOrder: 4,
  },
  inner_circle: {
    name: 'Inner Circle',
    backgroundColor: '#4A7C59',
    foregroundColor: '#FFFFFF',
    labelColor: '#D4E8DB',
    stripImage: null,
    logoOverride: null,
    cashbackRate: 10,
    minSpend: 500,
    sortOrder: 5,
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

export const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://loyalink.ai'
export const PLATFORM_URL  = process.env.NEXT_PUBLIC_PLATFORM_URL  || 'https://my.loyalink.ai'
export const APP_URL = PLATFORM_URL
export const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export const ROLES = ['owner', 'admin', 'member'] as const
export type Role = (typeof ROLES)[number]

export const LOYALTY_STAGES = ['bronze', 'silver', 'gold', 'platinum'] as const
export const TRANSACTION_TYPES = ['credit', 'debit', 'adjustment', 'cashback', 'referral_commission'] as const

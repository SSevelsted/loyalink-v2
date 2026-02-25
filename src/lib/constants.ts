export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
export const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export const ROLES = ['owner', 'admin', 'member'] as const
export type Role = (typeof ROLES)[number]

export const LOYALTY_STAGES = ['bronze', 'silver', 'gold', 'platinum'] as const
export const TRANSACTION_TYPES = ['credit', 'debit', 'adjustment', 'cashback', 'referral_commission'] as const

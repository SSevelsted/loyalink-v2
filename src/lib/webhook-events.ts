export type WebhookEvent =
  | 'member.created'
  | 'transaction.created'
  | 'balance.updated'
  | 'tier.upgraded'
  | 'referral.activated'
  | 'promotion.expired'

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'member.created', label: 'Member Created' },
  { value: 'transaction.created', label: 'Transaction Created' },
  { value: 'balance.updated', label: 'Balance Updated' },
  { value: 'tier.upgraded', label: 'Tier Upgraded' },
  { value: 'referral.activated', label: 'Referral Activated' },
  { value: 'promotion.expired', label: 'Promotion Expired' },
]

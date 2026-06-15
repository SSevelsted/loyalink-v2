export type WebhookEvent =
  | 'member.created'
  | 'transaction.created'
  | 'balance.updated'
  | 'tier.upgraded'
  | 'referral.activated'
  | 'promotion.expired'
  | 'card.installed'
  | 'card.uninstalled'

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'member.created', label: 'Member Created' },
  { value: 'transaction.created', label: 'Transaction Created' },
  { value: 'balance.updated', label: 'Balance Updated' },
  { value: 'tier.upgraded', label: 'Tier Upgraded' },
  { value: 'referral.activated', label: 'Referral Activated' },
  { value: 'promotion.expired', label: 'Promotion Expired' },
  // Wallet card lifecycle. Apple-only: Apple PassKit notifies us on add/remove,
  // but Google Wallet provides no server-side "saved" callback, so Google passes
  // never emit these events.
  { value: 'card.installed', label: 'Card Installed' },
  { value: 'card.uninstalled', label: 'Card Uninstalled' },
]

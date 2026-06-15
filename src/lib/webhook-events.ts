export type WebhookEvent =
  | 'member.created'
  | 'transaction.created'
  | 'balance.updated'
  | 'tier.upgraded'
  | 'referral.activated'
  | 'promotion.expired'
  | 'card.issued'
  | 'card.installed'
  | 'card.uninstalled'

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'member.created', label: 'Member Created' },
  { value: 'transaction.created', label: 'Transaction Created' },
  { value: 'balance.updated', label: 'Balance Updated' },
  { value: 'tier.upgraded', label: 'Tier Upgraded' },
  { value: 'referral.activated', label: 'Referral Activated' },
  { value: 'promotion.expired', label: 'Promotion Expired' },
  // Wallet card lifecycle — all three fire for both Apple and Google. Installs/
  // uninstalls come from Apple PassKit register/unregister and Google Wallet
  // save/delete callbacks. Note: Google's "save" callback is less reliable than
  // Apple's (delivery can lag or be missed), so Apple installs are the stronger
  // signal of the two.
  { value: 'card.issued', label: 'Card Issued' },
  { value: 'card.installed', label: 'Card Installed' },
  { value: 'card.uninstalled', label: 'Card Uninstalled' },
]

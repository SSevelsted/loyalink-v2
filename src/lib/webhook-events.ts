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
  // Wallet card lifecycle. card.issued (a card was offered) fires for both Apple
  // and Google. card.installed / card.uninstalled are Apple-only: Apple PassKit
  // notifies us on add/remove, but Google Wallet provides no server-side "saved"
  // callback, so Google passes never emit those two.
  { value: 'card.issued', label: 'Card Issued' },
  { value: 'card.installed', label: 'Card Installed' },
  { value: 'card.uninstalled', label: 'Card Uninstalled' },
]

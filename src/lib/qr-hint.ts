// "Scan for a gift" under the QR code on the wallet card.
// The pass service renders it per language (pass-service/src/utils/qrHint.ts).
// A studio turns it on or off in the card designer; it is stored as
// pass_templates.static_texts.qrHint. Missing means ON, so every new studio
// gets it. It shows only where friends get a welcome gift amount.

export const QR_HINT_EN = 'Scan for a gift'

/** The designer toggle: on unless set to false. Pure. */
export function qrHintOnFromStaticTexts(staticTexts: unknown): boolean {
  const t = staticTexts as { qrHint?: unknown } | null | undefined
  return !(t && typeof t === 'object' && t.qrHint === false)
}

/** Friends get a gift with an amount (referrals on, welcome bonus above 0). Pure. */
export function friendGiftAmountOn(referrals: { enabled?: unknown; friend_welcome_bonus?: unknown } | null | undefined): boolean {
  if (!referrals || referrals.enabled === false) return false
  const bonus = Number(referrals.friend_welcome_bonus)
  return Number.isFinite(bonus) && bonus > 0
}

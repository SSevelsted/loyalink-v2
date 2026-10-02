// How a transaction row reads to a person: its signed amount and its label.
//
// The stored sign is not consistent across types. A debit (balance used) is
// stored positive by processTransaction and negative by the members API. An
// adjustment carries its own sign: +25 for a welcome or gift bonus, -10 for a
// manual correction. Credits, cashback and referral commission are positive.
// So: a debit always subtracts, every other type is shown as stored.

export function signedTransactionAmount(type: string, amount: number | string | null | undefined): number {
  const value = Number(amount ?? 0)
  if (!Number.isFinite(value)) return 0
  if (type === 'debit') return -Math.abs(value)
  return value
}

/** "+" or the minus sign for a signed amount. Zero reads as "+". */
export function amountSign(signed: number): '+' | '−' {
  return signed < 0 ? '−' : '+'
}

/** Description that member-service writes for a referral welcome bonus. */
export const WELCOME_BONUS_DESCRIPTION = 'Welcome bonus from referral'

// Descriptions the system writes when no one gave a reason. They say nothing
// to the member ("api credit"), so the member sees a translated label instead.
const SYSTEM_DESCRIPTIONS = [
  /^(api|dashboard|embed|admin|manual|staff)\s+(credit|debit)$/i,
  /^balance override\b/i,
]

type TransactionLabels = Record<string, string>

/**
 * Member-facing label for a transaction row.
 *
 * An adjustment uses its description when a person wrote one (for example the
 * platform's "Gift from Ana"). The referral welcome bonus and system-written
 * descriptions get a translated label: a bonus when the amount is positive,
 * a balance adjustment when it is negative.
 */
export function memberTransactionLabel(
  tx: { type: string; amount: number | string; description?: string | null },
  labels: TransactionLabels,
): string {
  if (tx.type !== 'adjustment') return labels[tx.type] ?? tx.type

  const description = tx.description?.trim() ?? ''
  if (description === WELCOME_BONUS_DESCRIPTION) return labels.welcome_bonus ?? labels.adjustment ?? description
  if (description && !SYSTEM_DESCRIPTIONS.some((re) => re.test(description))) return description

  const signed = signedTransactionAmount(tx.type, tx.amount)
  return (signed >= 0 ? labels.bonus_added : labels.adjustment) ?? labels.adjustment ?? tx.type
}

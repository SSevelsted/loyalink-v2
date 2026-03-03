import type { RewardsConfig, UpgradeTriggerConfig, Transaction } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { CreditCard, Sparkles, Wallet, Gift, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Format a phone number string by inserting spaces every 2 digits.
 * Strips non-digit characters before formatting.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

/**
 * Resolve a loyalty_stage slug to its display name from the rewards config.
 * If the slug doesn't match any current tier (e.g. legacy "bronze"), falls back
 * to the first (base) tier's name so stale data still displays correctly.
 */
export function getTierDisplayName(slug: string, config?: RewardsConfig): string {
  if (config) {
    const tier = config.tiers.find((t) => t.slug === slug)
    if (tier) return tier.name
    // Legacy slug — show as base tier
    if (config.tiers.length > 0) return config.tiers[0].name
  }
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Resolve a potentially-legacy tier slug to the effective slug in the current config.
 * If the slug doesn't match any tier, returns the first (base) tier slug.
 */
export function getEffectiveTierSlug(slug: string, config?: RewardsConfig): string {
  if (!config || config.tiers.length === 0) return slug
  const match = config.tiers.find((t) => t.slug === slug)
  return match ? match.slug : config.tiers[0].slug
}

/**
 * Get the index of a tier slug in the rewards config (for color palette mapping).
 * Returns 0 if not found (legacy slugs map to base tier).
 */
export function getTierIndex(slug: string, config?: RewardsConfig): number {
  if (!config) return 0
  const idx = config.tiers.findIndex((t) => t.slug === slug)
  return idx >= 0 ? idx : 0
}

/** Friendly display names for transaction types */
export const TRANSACTION_LABELS: Record<string, string> = {
  credit: 'Purchase Recorded',
  debit: 'Balance Redeemed',
  adjustment: 'Balance Adjustment',
  cashback: 'Cashback Earned',
  referral_commission: 'Referral Bonus',
}

/** Semantic metadata for each transaction type — icon, label, and color tokens */
export const TRANSACTION_META = {
  credit: {
    label: 'Purchase',
    icon: CreditCard,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon_bg: 'bg-emerald-500/10',
    icon_color: 'text-emerald-500',
    amount: 'text-emerald-400',
    sign: '+',
  },
  debit: {
    label: 'Balance Used',
    icon: Wallet,
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    icon_bg: 'bg-red-500/10',
    icon_color: 'text-red-400',
    amount: 'text-red-400',
    sign: '−',
  },
  cashback: {
    label: 'Cashback',
    icon: Sparkles,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon_bg: 'bg-amber-500/10',
    icon_color: 'text-amber-400',
    amount: 'text-amber-400',
    sign: '+',
  },
  referral_commission: {
    label: 'Referral Bonus',
    icon: Gift,
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    icon_bg: 'bg-violet-500/10',
    icon_color: 'text-violet-400',
    amount: 'text-violet-400',
    sign: '+',
  },
  adjustment: {
    label: 'Adjustment',
    icon: SlidersHorizontal,
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon_bg: 'bg-blue-500/10',
    icon_color: 'text-blue-400',
    amount: 'text-blue-400',
    sign: '+',
  },
} as const satisfies Record<string, { label: string; icon: LucideIcon; badge: string; icon_bg: string; icon_color: string; amount: string; sign: string }>

/** Group items with created_at into date-labeled buckets (Today / Yesterday / D Mon) */
export function groupByDateLabel<T extends { created_at: string }>(rows: T[]): { label: string; items: T[] }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const d = new Date(row.created_at)
    d.setHours(0, 0, 0, 0)
    const label =
      d >= today ? 'Today'
      : d >= yesterday ? 'Yesterday'
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(row)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

/**
 * A purchase event: the credit row, plus any cashback/debit rows created in
 * the same API call (within 30 s, same customer). Standalone rows have only `primary`.
 */
export type TransactionGroup<T extends Transaction = Transaction> = {
  primary: T
  cashback?: T
  balanceUsed?: T
}

/**
 * Group a sorted transaction list so that each credit row absorbs its
 * related cashback and balance-used (debit) rows into a single group.
 * All other types (adjustment, referral_commission, standalone debit) remain ungrouped.
 */
export function groupRelatedTransactions<T extends Transaction>(transactions: T[]): TransactionGroup<T>[] {
  const WINDOW_MS = 30_000
  const absorbed = new Set<string>()
  const creditGroups = new Map<string, TransactionGroup<T>>()

  for (const tx of transactions) {
    if (tx.type !== 'credit') continue
    const txTime = new Date(tx.created_at).getTime()

    const cashback = transactions.find(
      (t) =>
        !absorbed.has(t.id) &&
        t.id !== tx.id &&
        t.type === 'cashback' &&
        t.customer_id === tx.customer_id &&
        Math.abs(new Date(t.created_at).getTime() - txTime) <= WINDOW_MS,
    )

    const balanceUsed = transactions.find(
      (t) =>
        !absorbed.has(t.id) &&
        t.id !== tx.id &&
        t.type === 'debit' &&
        t.customer_id === tx.customer_id &&
        Math.abs(new Date(t.created_at).getTime() - txTime) <= WINDOW_MS,
    )

    if (cashback) absorbed.add(cashback.id)
    if (balanceUsed) absorbed.add(balanceUsed.id)
    absorbed.add(tx.id)
    creditGroups.set(tx.id, { primary: tx, cashback, balanceUsed })
  }

  const groups: TransactionGroup<T>[] = []
  for (const tx of transactions) {
    if (absorbed.has(tx.id) && !creditGroups.has(tx.id)) continue
    groups.push(creditGroups.get(tx.id) ?? { primary: tx })
  }
  return groups
}

/** Manual transaction type definitions with labels and descriptions */
export const MANUAL_TRANSACTION_TYPES = [
  {
    value: 'credit',
    label: 'Record Purchase',
    description: 'Customer paid — adds cashback to their balance',
  },
  {
    value: 'debit',
    label: 'Redeem Balance',
    description: 'Customer uses their credit — subtracts from balance',
  },
  {
    value: 'adjustment',
    label: 'Balance Adjustment',
    description: 'Manual correction — add or remove balance',
  },
] as const

/**
 * Customer-facing display text for tier upgrade triggers.
 */
export function getTriggerDisplayText(trigger: UpgradeTriggerConfig, currency: string): string {
  const cfg = getCurrencyConfig(currency)
  switch (trigger.type) {
    case 'first_purchase':
      return 'After your first purchase'
    case 'first_full_payment':
      return 'After your first full payment'
    case 'total_spend':
      return `Spend ${formatAmount(trigger.threshold ?? 0, cfg)} total`
    case 'referral_count': {
      const n = trigger.threshold ?? 1
      return n === 1 ? 'Refer 1 friend' : `Refer ${n} friends`
    }
    case 'days_member': {
      const d = trigger.threshold ?? 30
      return `After ${d} days as a member`
    }
    default:
      return ''
  }
}

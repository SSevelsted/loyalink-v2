import { adminSupabase } from '@/lib/studio-access'
import { pushCustomerPass } from '@/lib/pass-push'
import { applyPermanentDeal, MemberDealError } from '@/lib/services/member-deal-service'

/**
 * Manual member-admin writes shared by the external v1 API routes, the embed
 * routes and the dashboard. Every surface needs identical behaviour — validate
 * against the studio's rewards_config, respect an active promotion, update the
 * customer, emit the `tier_change` analytics event (which the Tier History card
 * reads), and push a wallet-pass refresh. Keeping this in one place stops the
 * entry points from drifting.
 */

export class MemberAdminError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'MemberAdminError'
    this.status = status
  }
}

type ChangeTierInput = {
  studioId: string
  customerId: string
  tierSlug: string
  cashbackRate?: number | null
  source?: string
  /**
   * Push a wallet-pass refresh after the write (default true). The dashboard
   * passes false because its client already calls /api/pass/push/customer,
   * which also syncs legacy PassKit cards.
   */
  pushPass?: boolean
}

export type ChangeTierResult = {
  /** The member's permanent tier after the change. */
  tier_slug: string
  /** The member's permanent cashback rate after the change. */
  cashback_rate: number
  /** Tier in force right now. Differs from tier_slug while a tier_override runs. */
  effective_tier_slug: string
  /** Rate paid on purchases right now. Differs from cashback_rate while a promotion runs. */
  effective_cashback_rate: number
  /**
   * The active member_promotion whose fallback now holds the new tier + rate,
   * or null when no promotion was active and the change applied directly.
   */
  deferred_by_promotion: string | null
}

/**
 * Change a member's permanent tier (and optionally a custom cashback rate).
 *
 * Business rule: an active promotion is the member's main deal. The tier +
 * tier rate is the fallback they return to when it ends, and that fallback is
 * snapshotted on the promotion (`original_tier_slug`, `original_cashback_rate`),
 * which revoke/expire restore. So while a promotion is active, a tier change
 * rewrites that snapshot instead of being overwritten when the promotion ends:
 *   - cashback_boost: the tier changes now.
 *   - tier_override: the override stays in force; only the fallback changes.
 * Either way the member earns the higher of the promotion's rate and the new
 * fallback rate (best deal), and the customer row shows that rate.
 */
export async function changeTier(input: ChangeTierInput): Promise<ChangeTierResult> {
  const { studioId, customerId, tierSlug, cashbackRate, source = 'api', pushPass = true } = input

  if (!tierSlug) throw new MemberAdminError('tier_slug is required', 400)

  try {
    const result = await applyPermanentDeal({
      studioId,
      customerId,
      tierSlug,
      cashbackRate,
      source,
      // Every manual edit is logged, also a rate-only one on the same tier.
      tierChangeEvent: 'always',
      pushPass,
    })
    return {
      tier_slug: result.tier_slug,
      cashback_rate: result.cashback_rate,
      effective_tier_slug: result.effective_tier_slug,
      effective_cashback_rate: result.effective_cashback_rate,
      deferred_by_promotion: result.promotion?.id ?? null,
    }
  } catch (err) {
    if (err instanceof MemberDealError) throw new MemberAdminError(err.message, err.status)
    throw err
  }
}

type AdjustBalanceInput = {
  studioId: string
  customerId: string
  type: 'credit' | 'debit'
  amount: number
  description?: string | null
  createdBy?: string
}

export async function adjustBalance(input: AdjustBalanceInput): Promise<{ balance: number }> {
  const { studioId, customerId, type, amount, description, createdBy = 'api' } = input

  if (!type || !['credit', 'debit'].includes(type)) {
    throw new MemberAdminError('type must be "credit" or "debit"', 400)
  }
  if (typeof amount !== 'number' || amount <= 0) {
    throw new MemberAdminError('amount must be a positive number', 400)
  }

  const { data: customer } = await adminSupabase
    .from('customers')
    .select('id, balance, studio_id')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .single()
  if (!customer) throw new MemberAdminError('Member not found', 404)

  const balanceChange = type === 'credit' ? amount : -amount
  const newBalance = Number(customer.balance) + balanceChange
  if (newBalance < 0) throw new MemberAdminError('Insufficient balance', 400)

  await adminSupabase.from('transactions').insert({
    customer_id: customerId,
    studio_id: studioId,
    type: type === 'credit' ? 'adjustment' : 'debit',
    amount: type === 'credit' ? amount : -amount,
    description: description || `${createdBy} ${type}`,
    created_by: createdBy,
  })

  await adminSupabase.from('customers').update({ balance: newBalance }).eq('id', customerId)

  pushCustomerPass(customerId)

  return { balance: newBalance }
}

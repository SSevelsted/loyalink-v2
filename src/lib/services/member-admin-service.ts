import { adminSupabase } from '@/lib/studio-access'
import { passServiceFetch } from '@/lib/pass-service'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG, type RewardsConfig } from '@/types/database'

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

async function loadRewardsConfig(studioId: string): Promise<RewardsConfig> {
  const { data: studio } = await adminSupabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()
  const settings = studio?.settings as Record<string, unknown> | null
  return settings?.rewards_config ? migrateRewardsConfig(settings.rewards_config) : DEFAULT_REWARDS_CONFIG
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

type ActivePromotion = {
  id: string
  type: 'cashback_boost' | 'tier_override'
  cashback_rate: number | string | null
  original_tier_slug: string
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
 *   - cashback_boost: the tier changes now; the boost rate stays in force.
 *   - tier_override: the override stays in force; only the fallback changes.
 */
export async function changeTier(input: ChangeTierInput): Promise<ChangeTierResult> {
  const { studioId, customerId, tierSlug, cashbackRate, source = 'api', pushPass = true } = input

  if (!tierSlug) throw new MemberAdminError('tier_slug is required', 400)

  const { data: customer } = await adminSupabase
    .from('customers')
    .select('id, loyalty_stage, cashback_rate, studio_id')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .single()
  if (!customer) throw new MemberAdminError('Member not found', 404)

  const config = await loadRewardsConfig(studioId)
  const tier = config.tiers.find((t) => t.slug === tierSlug)
  if (!tier) throw new MemberAdminError(`Tier "${tierSlug}" not found in rewards config`, 400)

  const newCashbackRate = cashbackRate ?? tier.cashback_rate

  const { data: activePromo, error: promoError } = await adminSupabase
    .from('member_promotions')
    .select('id, type, cashback_rate, original_tier_slug')
    .eq('customer_id', customerId)
    .eq('studio_id', studioId)
    .eq('status', 'active')
    .maybeSingle<ActivePromotion>()
  if (promoError) {
    throw new MemberAdminError(`Failed to load active promotion: ${promoError.message}`, 500)
  }

  // The permanent change becomes the promotion's fallback. Filtering on
  // status='active' again means a promotion that ended since the read above
  // matches no row, and the change then applies directly below.
  let promo: ActivePromotion | null = null
  if (activePromo) {
    const { data: updatedPromos, error: snapshotError } = await adminSupabase
      .from('member_promotions')
      .update({ original_tier_slug: tierSlug, original_cashback_rate: newCashbackRate })
      .eq('id', activePromo.id)
      .eq('status', 'active')
      .select('id')
    if (snapshotError) {
      throw new MemberAdminError(`Failed to update promotion fallback: ${snapshotError.message}`, 500)
    }
    if (updatedPromos && updatedPromos.length > 0) promo = activePromo
  }

  const previousTier = promo ? promo.original_tier_slug : customer.loyalty_stage
  let effectiveTier: string = tierSlug
  let effectiveRate: number = newCashbackRate
  let customerUpdate: { loyalty_stage?: string; cashback_rate?: number } | null = {
    loyalty_stage: tierSlug,
    cashback_rate: newCashbackRate,
  }

  if (promo?.type === 'cashback_boost' && promo.cashback_rate != null) {
    // The boost rate is what purchases pay (transaction-service), so the
    // customer row keeps showing it while the tier moves now.
    effectiveRate = Number(promo.cashback_rate)
    customerUpdate = { loyalty_stage: tierSlug, cashback_rate: effectiveRate }
  } else if (promo?.type === 'tier_override') {
    // The override stays in force until it ends; only the fallback changed.
    effectiveTier = customer.loyalty_stage
    effectiveRate = Number(customer.cashback_rate ?? 0)
    customerUpdate = null
  }

  if (customerUpdate) {
    const { error: customerError } = await adminSupabase
      .from('customers')
      .update(customerUpdate)
      .eq('id', customerId)
      .eq('studio_id', studioId)
    if (customerError) {
      throw new MemberAdminError(`Failed to update member tier: ${customerError.message}`, 500)
    }
  }

  if (pushPass) {
    void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})
  }

  const { error: eventError } = await adminSupabase.from('analytics_events').insert({
    studio_id: studioId,
    event_type: 'tier_change',
    customer_id: customerId,
    metadata: {
      from_tier: previousTier,
      from_tier_name: config.tiers.find((t) => t.slug === previousTier)?.name ?? previousTier,
      to_tier: tierSlug,
      to_tier_name: tier.name,
      cashback_rate: newCashbackRate,
      effective_cashback_rate: effectiveRate,
      source,
      ...(promo ? { deferred_by_promotion: promo.id, promotion_type: promo.type } : {}),
    },
  })
  if (eventError) {
    throw new MemberAdminError(`Tier changed but the tier_change event failed to save: ${eventError.message}`, 500)
  }

  return {
    tier_slug: tierSlug,
    cashback_rate: newCashbackRate,
    effective_tier_slug: effectiveTier,
    effective_cashback_rate: effectiveRate,
    deferred_by_promotion: promo?.id ?? null,
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

  void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})

  return { balance: newBalance }
}

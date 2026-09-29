import { adminSupabase } from '@/lib/studio-access'
import { passServiceFetch } from '@/lib/pass-service'
import type { RewardsConfig } from '@/types/database'
import { dealRow, loadRewardsConfig, MemberDealError } from '@/lib/services/member-deal-service'

type ApplyPromotionInput = {
  studioId: string
  customerId: string
  promotionId?: string
  type: 'cashback_boost' | 'tier_override'
  cashbackRate?: number | null
  tierSlug?: string | null
  durationType: 'transactions' | 'days' | 'unlimited'
  durationValue: number
  appliedBy?: string
}

/**
 * Start a promotion for a member. The member's current tier + rate become its
 * fallback snapshot (restored by revoke/expire), and the customer row shows
 * the deal in force: the override tier for a tier_override, and the best-deal
 * rate (the higher of the promotion's rate and the fallback rate).
 */
export async function applyPromotion(input: ApplyPromotionInput) {
  const { studioId, customerId, promotionId, type, cashbackRate, tierSlug, durationType, durationValue, appliedBy } = input

  // Check for existing active promotion
  const { data: existing } = await adminSupabase
    .from('member_promotions')
    .select('id')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .single()

  if (existing) {
    throw new PromotionError('Member already has an active promotion. Revoke it first.', 409)
  }

  // Fetch customer's current state (to snapshot for revert)
  const { data: customer } = await adminSupabase
    .from('customers')
    .select('loyalty_stage, cashback_rate, studio_id')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .single()

  if (!customer) {
    throw new PromotionError('Customer not found', 404)
  }

  let config: RewardsConfig
  try {
    config = await loadRewardsConfig(studioId)
  } catch (err) {
    if (err instanceof MemberDealError) throw new PromotionError(err.message, err.status)
    throw err
  }
  if (type === 'tier_override' && !config.tiers.some((t) => t.slug === tierSlug)) {
    throw new PromotionError(`Tier "${tierSlug ?? ''}" not found in rewards config`, 400)
  }

  // Calculate expires_at for time-based
  let expiresAt: string | null = null
  let remainingTransactions: number | null = null

  if (durationType === 'days') {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + durationValue)
    expiresAt = expiry.toISOString()
  } else if (durationType === 'transactions') {
    remainingTransactions = durationValue
  }

  const fallbackTier = customer.loyalty_stage as string
  const fallbackRate = Number(customer.cashback_rate ?? 0)

  // Create member_promotion
  const { data: memberPromo, error } = await adminSupabase
    .from('member_promotions')
    .insert({
      studio_id: studioId,
      customer_id: customerId,
      promotion_id: promotionId || null,
      type,
      cashback_rate: type === 'cashback_boost' ? cashbackRate : null,
      tier_slug: type === 'tier_override' ? tierSlug : null,
      original_tier_slug: fallbackTier,
      original_cashback_rate: fallbackRate,
      remaining_transactions: remainingTransactions,
      expires_at: expiresAt,
      status: 'active',
      applied_by: appliedBy || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new PromotionError('Member already has an active promotion', 409)
    }
    throw new PromotionError(error.message, 500)
  }

  const row = dealRow(
    {
      type,
      cashback_rate: type === 'cashback_boost' ? cashbackRate ?? null : null,
      tier_slug: type === 'tier_override' ? tierSlug ?? null : null,
    },
    fallbackTier,
    fallbackRate,
    config.tiers,
    fallbackTier,
  )
  const { error: rowError } = await adminSupabase
    .from('customers')
    .update(row)
    .eq('id', customerId)
    .eq('studio_id', studioId)
  if (rowError) {
    throw new PromotionError(`Promotion started but the member row failed to update: ${rowError.message}`, 500)
  }

  void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})

  return memberPromo
}

export async function revokePromotion(memberPromotionId: string, studioId: string) {
  const { data: promo } = await adminSupabase
    .from('member_promotions')
    .select('*')
    .eq('id', memberPromotionId)
    .eq('studio_id', studioId)
    .eq('status', 'active')
    .single()

  if (!promo) {
    throw new PromotionError('Active promotion not found', 404)
  }

  // Revert customer to original state
  await adminSupabase
    .from('customers')
    .update({
      loyalty_stage: promo.original_tier_slug,
      cashback_rate: promo.original_cashback_rate,
    })
    .eq('id', promo.customer_id)

  // Mark promotion as revoked
  await adminSupabase
    .from('member_promotions')
    .update({ status: 'revoked', expired_at: new Date().toISOString() })
    .eq('id', memberPromotionId)

  // Push pass update
  void passServiceFetch(`/api/push/customer/${promo.customer_id}`, { method: 'POST' }).catch(() => {})

  return { revoked: true }
}

export async function expirePromotion(memberPromotionId: string, customerId: string, originalTierSlug: string, originalCashbackRate: number) {
  await adminSupabase
    .from('customers')
    .update({
      loyalty_stage: originalTierSlug,
      cashback_rate: originalCashbackRate,
    })
    .eq('id', customerId)

  await adminSupabase
    .from('member_promotions')
    .update({ status: 'expired', expired_at: new Date().toISOString() })
    .eq('id', memberPromotionId)

  void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})
}

export class PromotionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'PromotionError'
    this.status = status
  }
}

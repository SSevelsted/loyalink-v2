import { adminSupabase } from '@/lib/studio-access'
import { passServiceFetch } from '@/lib/pass-service'

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
      original_tier_slug: customer.loyalty_stage,
      original_cashback_rate: Number(customer.cashback_rate ?? 0),
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

  // If tier_override, update customer's tier + rate immediately
  if (type === 'tier_override' && tierSlug) {
    // Fetch the tier's cashback rate from rewards config
    const { data: studio } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single()

    const settings = studio?.settings as Record<string, unknown> | null
    const rewardsConfig = settings?.rewards_config as Record<string, unknown> | null
    const tiers = (rewardsConfig?.tiers as Array<{ slug: string; cashback_rate: number }>) ?? []
    const tier = tiers.find(t => t.slug === tierSlug)

    await adminSupabase
      .from('customers')
      .update({
        loyalty_stage: tierSlug,
        cashback_rate: tier?.cashback_rate ?? cashbackRate ?? customer.cashback_rate,
      })
      .eq('id', customerId)

    // Push pass update
    void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})
  }

  // If cashback_boost, update the cashback rate immediately
  if (type === 'cashback_boost' && cashbackRate != null) {
    await adminSupabase
      .from('customers')
      .update({ cashback_rate: cashbackRate })
      .eq('id', customerId)

    void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})
  }

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

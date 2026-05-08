import Stripe from 'stripe'

// Server-side only — never import in client components
// Lazily instantiated so missing env var during build doesn't crash module evaluation
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  }
  return _stripe
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'agency'

/** True if the studio should have full access to the dashboard */
export function isSubscriptionActive(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'trial' || status === 'active' || status === 'agency'
}

export type ResolvedPromo = {
  /** Stripe promotion_code id (`promo_...`) when the input matched a promotion code — pass this on the subscription so Stripe counts the redemption */
  promotionCodeId: string | null
  /** Underlying coupon object — always present on a successful match */
  coupon: Stripe.Coupon
}

/**
 * Resolve a user-entered code to a Stripe coupon. Tries promotion codes first
 * (customer-facing, case-sensitive), then falls back to coupon-by-ID for legacy
 * callers. Returns null if nothing valid matches.
 */
export async function resolvePromoCode(
  stripe: Stripe,
  code: string | null | undefined
): Promise<ResolvedPromo | null> {
  const trimmed = code?.trim()
  if (!trimmed) return null

  try {
    const list = await stripe.promotionCodes.list({
      code: trimmed,
      active: true,
      limit: 1,
      expand: ['data.promotion.coupon'],
    })
    const promo = list.data[0]
    const promoCoupon = promo?.promotion.coupon
    if (promoCoupon && typeof promoCoupon !== 'string' && promoCoupon.valid) {
      return { promotionCodeId: promo.id, coupon: promoCoupon }
    }
  } catch {
    // fall through
  }

  try {
    const coupon = await stripe.coupons.retrieve(trimmed.toUpperCase())
    if (coupon.valid) return { promotionCodeId: null, coupon }
  } catch {
    // not a coupon id either
  }

  return null
}

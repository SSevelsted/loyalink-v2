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

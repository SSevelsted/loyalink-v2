import Stripe from 'stripe'

// Server-side only — never import in client components
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'agency'

/** True if the studio should have full access to the dashboard */
export function isSubscriptionActive(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'trial' || status === 'active' || status === 'agency'
}

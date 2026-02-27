/**
 * Cron: runs on the 1st of each month (Vercel cron or external scheduler)
 * Snapshots the active customer count for each studio and updates
 * their Stripe subscription quantity accordingly.
 *
 * Vercel cron config in vercel.json:
 *   { "path": "/api/cron/billing-sync", "schedule": "0 1 1 * *" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Protect the cron endpoint
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ skipped: true, reason: 'Stripe not configured' })
  }

  // Fetch all active studios with a Stripe subscription
  const { data: studios, error } = await supabase
    .from('studios')
    .select('id, name, stripe_subscription_id, subscription_status')
    .eq('subscription_status', 'active')
    .not('stripe_subscription_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { studioId: string; name: string; quantity: number; status: string }[] = []

  for (const studio of studios ?? []) {
    try {
      // Count active customers for this studio
      const { count } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('studio_id', studio.id)

      const quantity = count ?? 0

      // Update Stripe subscription quantity (no proration — new period only)
      await stripe.subscriptions.update(studio.stripe_subscription_id!, {
        items: [], // will be resolved from the existing subscription
        proration_behavior: 'none',
      })

      // Update each item's quantity
      const sub = await stripe.subscriptions.retrieve(studio.stripe_subscription_id!)
      for (const item of sub.items.data) {
        await stripe.subscriptionItems.update(item.id, { quantity })
      }

      results.push({ studioId: studio.id, name: studio.name, quantity, status: 'updated' })
    } catch (err) {
      console.error(`[billing-sync] error for studio ${studio.id}:`, err)
      results.push({ studioId: studio.id, name: studio.name, quantity: 0, status: 'error' })
    }
  }

  return NextResponse.json({ synced: results.length, results })
}

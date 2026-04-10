/**
 * Cron: runs on the 1st of each month (Vercel cron or external scheduler)
 * Reports active member usage for each studio to Stripe (graduated tiered price).
 * Active member = customer with a wallet pass currently in status 'installed'.
 *
 * Vercel cron config in vercel.json:
 *   { "path": "/api/cron/billing-sync", "schedule": "0 1 1 * *" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { verifyCronSecret } from '@/lib/cron'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_MEMBER_PRICE_ID) {
    return NextResponse.json({ skipped: true, reason: 'Stripe not fully configured' })
  }

  const { data: studios, error } = await supabase
    .from('studios')
    .select('id, name, stripe_subscription_id, subscription_status')
    .in('subscription_status', ['active', 'trial'])
    .not('stripe_subscription_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { studioId: string; name: string; activeMembers: number; status: string }[] = []

  for (const studio of studios ?? []) {
    try {
      // Count customers with a pass currently installed in their wallet
      const { count } = await supabase
        .from('wallet_passes')
        .select('id', { count: 'exact', head: true })
        .eq('studio_id', studio.id)
        .eq('status', 'installed')

      const activeMembers = count ?? 0

      // Find the metered subscription item
      const sub = await getStripe().subscriptions.retrieve(studio.stripe_subscription_id!)
      const memberItem = sub.items.data.find(
        (item) => item.price.id === process.env.STRIPE_MEMBER_PRICE_ID
      )

      if (!memberItem) {
        results.push({ studioId: studio.id, name: studio.name, activeMembers, status: 'no_member_item' })
        continue
      }

      // Update quantity on the graduated tiered price item
      await getStripe().subscriptionItems.update(memberItem.id, {
        quantity: activeMembers,
        proration_behavior: 'none',
      })

      results.push({ studioId: studio.id, name: studio.name, activeMembers, status: 'updated' })
    } catch (err) {
      console.error(`[billing-sync] error for studio ${studio.id}:`, err)
      results.push({ studioId: studio.id, name: studio.name, activeMembers: 0, status: 'error' })
    }
  }

  return NextResponse.json({ synced: results.length, results })
}

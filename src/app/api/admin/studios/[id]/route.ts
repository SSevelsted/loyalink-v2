import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TRIAL_DAYS = 30
const stripeEnabled = !!process.env.STRIPE_SECRET_KEY

async function verifySuperAdmin() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('studio_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .limit(1)
    .single()
  return data ? user : null
}

/**
 * PATCH /api/admin/studios/[id]
 * Body: { action: 'remove_agency' | 'cancel' | 'reactivate' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action } = await request.json() as { action: string }

  const { data: studio } = await supabase
    .from('studios')
    .select('*')
    .eq('id', id)
    .single()

  if (!studio) return NextResponse.json({ error: 'Studio not found' }, { status: 404 })

  if (action === 'remove_agency') {
    // Remove the 100% coupon and add a 30-day trial
    if (stripeEnabled && studio.stripe_subscription_id) {
      try {
        // Remove discount
        await getStripe().subscriptions.deleteDiscount(studio.stripe_subscription_id)
        // Add a 30-day trial from now
        const trialEnd = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60
        await getStripe().subscriptions.update(studio.stripe_subscription_id, {
          trial_end: trialEnd,
        })
      } catch (err) {
        console.error('[admin/studios] Stripe remove_agency error:', err)
      }
    }

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('studios')
      .update({ is_agency: false, subscription_status: 'trial', trial_ends_at: trialEndsAt })
      .eq('id', id)

    return NextResponse.json({ success: true, status: 'trial' })
  }

  if (action === 'cancel') {
    if (stripeEnabled && studio.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.update(studio.stripe_subscription_id, {
          cancel_at_period_end: true,
        })
      } catch (err) {
        console.error('[admin/studios] Stripe cancel error:', err)
      }
    }
    await supabase
      .from('studios')
      .update({ subscription_status: 'cancelled' })
      .eq('id', id)

    return NextResponse.json({ success: true, status: 'cancelled' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

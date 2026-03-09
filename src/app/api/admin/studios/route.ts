import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import crypto from 'crypto'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TRIAL_DAYS = 14
const stripeEnabled = !!process.env.STRIPE_SECRET_KEY

async function verifySuperAdmin() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('studio_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .limit(1)
    .single()

  return membership ? user : null
}

/** Get or create the permanent 100% off agency coupon */
async function getAgencyCouponId(): Promise<string> {
  const existingId = process.env.STRIPE_AGENCY_COUPON_ID
  if (existingId) return existingId

  // Create it once — subsequent calls will find it by name lookup
  try {
    const coupons = await getStripe().coupons.list({ limit: 100 })
    const existing = coupons.data.find((c) => c.name === 'Agency Partner')
    if (existing) return existing.id
  } catch { /* ignore */ }

  const coupon = await getStripe().coupons.create({
    name: 'Agency Partner',
    percent_off: 100,
    duration: 'forever',
    currency: 'eur',
  })
  return coupon.id
}

export async function POST(request: NextRequest) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, ownerEmail, type } = body as {
    name: string
    ownerEmail: string
    type: 'trial' | 'agency'
  }

  if (!name?.trim() || !ownerEmail?.trim() || !type) {
    return NextResponse.json({ error: 'name, ownerEmail, and type are required' }, { status: 400 })
  }

  // Generate slug from name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Ensure unique slug
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase
      .from('studios')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const trialEndsAt =
    type === 'trial'
      ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null

  // 1. Create studio
  const { data: studio, error: studioError } = await supabase
    .from('studios')
    .insert({
      name: name.trim(),
      slug,
      subscription_status: type === 'agency' ? 'agency' : 'trial',
      trial_ends_at: trialEndsAt,
      is_agency: type === 'agency',
      settings: {},
    })
    .select()
    .single()

  if (studioError || !studio) {
    console.error('[admin/studios] create error:', studioError)
    return NextResponse.json({ error: 'Failed to create studio' }, { status: 500 })
  }

  // 2. Stripe customer + subscription (if Stripe is configured)
  if (stripeEnabled) {
    try {
      const customer = await getStripe().customers.create({
        name: name.trim(),
        email: ownerEmail.trim(),
        metadata: { studio_id: studio.id, studio_slug: slug },
      })

      const couponId = type === 'agency' ? await getAgencyCouponId() : undefined

      const subscription = await getStripe().subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 0 }],
        metadata: { studio_id: studio.id },
        ...(type === 'trial'
          ? {
              trial_period_days: TRIAL_DAYS,
              trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
            }
          : { discount: { coupon: couponId! } }),
      })

      await supabase
        .from('studios')
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
        })
        .eq('id', studio.id)
    } catch (err) {
      console.error('[admin/studios] Stripe error:', err)
      // Non-fatal: studio is created, Stripe can be linked later
    }
  }

  // 3. Create invitation for owner
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

  await supabase.from('invitations').insert({
    studio_id: studio.id,
    email: ownerEmail.trim(),
    role: 'owner',
    token,
    expires_at: expiresAt,
  })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${token}`

  return NextResponse.json({ success: true, studio, inviteUrl })
}

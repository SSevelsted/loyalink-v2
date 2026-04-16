import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { signupLimiter, getIP } from '@/lib/rate-limit'

/**
 * Prepare step for already-authenticated users who need to create their studio.
 * Happens when a user signs in via Apple/Google SSO but has no studio yet.
 *
 * Parallels /api/signup/prepare but reuses the existing auth user's email
 * instead of taking one from the form. Creates a Stripe customer + SetupIntent
 * and returns the clientSecret + optional coupon.
 */
export async function POST(request: NextRequest) {
  const { success } = signupLimiter.check(5, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { studioName, promoCode } = await request.json()
  const normalizedStudioName = studioName?.trim()

  if (!normalizedStudioName) {
    return NextResponse.json({ error: 'studioName is required' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  if (!user.email) {
    return NextResponse.json({ error: 'Account has no email address' }, { status: 400 })
  }

  try {
    const stripe = getStripe()

    const [customer, coupon] = await Promise.all([
      stripe.customers.create({
        email: user.email,
        name: normalizedStudioName,
        metadata: { source: 'dashboard_onboarding', user_id: user.id },
      }),
      promoCode?.trim()
        ? stripe.coupons.retrieve(promoCode.trim().toUpperCase()).catch(() => null)
        : Promise.resolve(null),
    ])

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      metadata: { studio_name: normalizedStudioName, user_id: user.id },
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      coupon: coupon?.valid
        ? {
            id: coupon.id,
            percentOff: coupon.percent_off ?? null,
            amountOff: coupon.amount_off ?? null,
            currency: coupon.currency ?? null,
            duration: coupon.duration,
            durationInMonths: coupon.duration_in_months ?? null,
            name: coupon.name ?? null,
          }
        : null,
    })
  } catch (err) {
    console.error('[onboarding/subscribe/prepare]', err)
    return NextResponse.json({ error: 'Failed to initialize payment setup' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { signupLimiter, getIP } from '@/lib/rate-limit'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function emailExists(email: string) {
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })

    if (error) {
      throw error
    }

    const users = data.users ?? []
    if (users.some((user) => user.email?.toLowerCase() === email)) {
      return true
    }

    if (users.length < 1000) {
      return false
    }

    page += 1
  }
}

export async function POST(request: NextRequest) {
  const { success } = signupLimiter.check(5, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { email, studioName, promoCode } = await request.json()
  const normalizedEmail = email?.trim()?.toLowerCase()
  const normalizedStudioName = studioName?.trim()

  if (!normalizedEmail || !normalizedStudioName) {
    return NextResponse.json({ error: 'email and studioName are required' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  try {
    if (await emailExists(normalizedEmail)) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    const [customer, coupon] = await Promise.all([
      stripe.customers.create({
        email: normalizedEmail,
        name: normalizedStudioName,
        metadata: { source: 'self_signup' },
      }),
      promoCode?.trim()
        ? stripe.coupons.retrieve(promoCode.trim().toUpperCase()).catch(() => null)
        : Promise.resolve(null),
    ])

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      metadata: { studio_name: normalizedStudioName },
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
    console.error('[signup/prepare]', err)
    return NextResponse.json({ error: 'Failed to initialize payment setup' }, { status: 500 })
  }
}

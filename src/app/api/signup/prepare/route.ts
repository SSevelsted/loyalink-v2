import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe, resolvePromoCode } from '@/lib/stripe'
import { DEFAULT_TRIAL_DAYS, lookupTrialCode, trialCodeErrorMessage } from '@/lib/trial-codes'
import { signupLimiter, getIP } from '@/lib/rate-limit'
import { isNativeRequest } from '@/lib/native-request'

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
  if (isNativeRequest(request)) {
    return NextResponse.json({ error: 'Not available in app' }, { status: 403 })
  }

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

    // A code is either one of our single-use trial codes (changes the trial
    // length) or a Stripe promotion code (changes the price after the trial).
    const [trialLookup, promo] = await Promise.all([
      lookupTrialCode(supabase, promoCode),
      resolvePromoCode(stripe, promoCode),
    ])
    if (trialLookup.kind === 'invalid') {
      return NextResponse.json({ error: trialCodeErrorMessage(trialLookup.status, trialLookup.code) }, { status: 400 })
    }
    const trialCode = trialLookup.kind === 'valid' ? trialLookup.code : null
    const coupon = trialCode ? null : promo?.coupon ?? null
    if (typeof promoCode === 'string' && promoCode.trim() && !trialCode && !coupon) {
      return NextResponse.json(
        { error: "That code isn't valid. Check the spelling, or remove it to continue." },
        { status: 400 }
      )
    }

    const customer = await stripe.customers.create({
      email: normalizedEmail,
      name: normalizedStudioName,
      metadata: { source: 'self_signup' },
    })

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
      promoValid: !!coupon || !!trialCode,
      trial: trialCode ? { code: trialCode.code, days: trialCode.trial_days } : null,
      trialDays: trialCode?.trial_days ?? DEFAULT_TRIAL_DAYS,
    })
  } catch (err) {
    console.error('[signup/prepare]', err)
    return NextResponse.json({ error: 'Failed to initialize payment setup' }, { status: 500 })
  }
}

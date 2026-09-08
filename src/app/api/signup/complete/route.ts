import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe, resolvePromoCode } from '@/lib/stripe'
import {
  DEFAULT_TRIAL_DAYS,
  lookupTrialCode,
  redeemTrialCode,
  trialCodeErrorMessage,
  trialEndsAtFromDays,
} from '@/lib/trial-codes'
import { PLATFORM_URL } from '@/lib/constants'
import { sendStudioWelcome } from '@/lib/email/send'
import { generateUniqueSlug } from '@/lib/slug'
import { signupLimiter, getIP } from '@/lib/rate-limit'
import { isNativeRequest } from '@/lib/native-request'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

export async function POST(request: NextRequest) {
  if (isNativeRequest(request)) {
    return NextResponse.json({ error: 'Not available in app' }, { status: 403 })
  }

  const { success } = signupLimiter.check(5, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { name, email, password, studioName, plan, customerId, paymentMethodId, promoCode } =
      await request.json()

    if (!name?.trim() || !email?.trim() || !password || !studioName?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const selectedPlan = plan === 'pro' ? 'pro' : 'basic'

    // Trial codes are validated before anything is created so a burnt code
    // fails fast instead of leaving behind a half-made account.
    const trialLookup = await lookupTrialCode(supabase, promoCode)
    if (trialLookup.kind === 'invalid') {
      return NextResponse.json({ error: trialCodeErrorMessage(trialLookup.status, trialLookup.code) }, { status: 400 })
    }
    const trialCode = trialLookup.kind === 'valid' ? trialLookup.code : null
    let trialDays = trialCode?.trial_days ?? DEFAULT_TRIAL_DAYS
    let trialEndsAt = trialEndsAtFromDays(trialDays)

    // 1. Create Supabase user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim() },
    })

    if (authError || !authData.user) {
      console.error('[signup/complete] auth error:', authError)
      return NextResponse.json({ error: 'Could not create account. Please try again or contact support.' }, { status: 400 })
    }

    const user = authData.user

    // 2. Create studio
    const slug = await generateUniqueSlug(studioName)

    const { data: studio, error: studioError } = await supabase
      .from('studios')
      .insert({
        name: studioName.trim(),
        slug,
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
        is_agency: false,
        settings: {
          plan: selectedPlan,
          source: 'loyalink',
          ...(trialCode ? { trial_code: trialCode.code } : {}),
        },
      })
      .select()
      .single()

    if (studioError || !studio) {
      console.error('[signup/complete] studio error:', studioError)
      await supabase.auth.admin.deleteUser(user.id)
      return NextResponse.json({ error: 'Failed to create studio' }, { status: 500 })
    }

    // 3. Add owner membership
    const { error: memberError } = await supabase.from('studio_members').insert({
      studio_id: studio.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      console.error('[signup/complete] member error:', memberError)
      await supabase.from('studios').delete().eq('id', studio.id)
      await supabase.auth.admin.deleteUser(user.id)
      return NextResponse.json({ error: 'Failed to set up studio membership' }, { status: 500 })
    }

    // 3b. Burn the trial code. If a concurrent signup redeemed it first, this
    // studio silently gets the default trial rather than a second free ride.
    if (trialCode) {
      const redeemed = await redeemTrialCode(supabase, trialCode.id, { studioId: studio.id, email: email.trim() })
      if (!redeemed) {
        console.warn('[signup/complete] trial code exhausted at claim time, falling back to default trial:', trialCode.code)
        trialDays = DEFAULT_TRIAL_DAYS
        trialEndsAt = trialEndsAtFromDays(trialDays)
        await supabase.from('studios').update({ trial_ends_at: trialEndsAt }).eq('id', studio.id)
      }
    }

    // 4. Stripe subscription with flat base + metered member price
    if (process.env.STRIPE_SECRET_KEY && customerId && paymentMethodId) {
      try {
        const stripe = getStripe()

        // Parallel: attach payment method + resolve promo code (a trial code is not a Stripe discount)
        const [, promo] = await Promise.all([
          stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }),
          trialCode ? Promise.resolve(null) : resolvePromoCode(stripe, promoCode),
        ])

        const basePriceId = PLAN_PRICE_IDS[selectedPlan]
        const memberPriceId = process.env.STRIPE_MEMBER_PRICE_ID

        if (!basePriceId || !memberPriceId) {
          console.warn('[signup/complete] Missing Stripe price IDs — skipping subscription')
        } else {
          // Parallel: update customer metadata + create subscription
          const [, subscription] = await Promise.all([
            stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
              metadata: { studio_id: studio.id, studio_slug: slug, plan: selectedPlan },
            }),
            stripe.subscriptions.create({
              customer: customerId,
              items: [
                { price: basePriceId },
                { price: memberPriceId },
              ],
              default_payment_method: paymentMethodId,
              trial_period_days: trialDays,
              trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
              metadata: { studio_id: studio.id, plan: selectedPlan },
              ...(promo?.promotionCodeId
                ? { discounts: [{ promotion_code: promo.promotionCodeId }] }
                : promo?.coupon
                  ? { discounts: [{ coupon: promo.coupon.id }] }
                  : {}),
            }),
          ])

          await supabase
            .from('studios')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', studio.id)
        }
      } catch (err) {
        console.error('[signup/complete] Stripe error:', err)
        // Non-fatal — studio is created, Stripe can be linked later
      }
    }

    // 5. Send welcome email (fire-and-forget)
    sendStudioWelcome(email, name, studioName, selectedPlan, trialEndsAt)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[signup/complete] unhandled error:', error)
    return NextResponse.json({ error: 'Failed to finish signup' }, { status: 500 })
  }
}

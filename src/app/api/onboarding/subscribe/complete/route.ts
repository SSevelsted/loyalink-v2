import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'
import { getStripe, resolvePromoCode } from '@/lib/stripe'
import { sendStudioWelcome } from '@/lib/email/send'
import { generateUniqueSlug } from '@/lib/slug'
import { signupLimiter, getIP } from '@/lib/rate-limit'
import { isNativeRequest } from '@/lib/native-request'

const TRIAL_DAYS = 14

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

/**
 * Complete step for dashboard onboarding — an already-authenticated user
 * (typically signed in via Apple/Google SSO) creates their studio and
 * subscription. Parallels /api/signup/complete but skips auth user creation
 * because the caller is already authed.
 */
export async function POST(request: NextRequest) {
  if (isNativeRequest(request)) {
    return NextResponse.json({ error: 'Not available in app' }, { status: 403 })
  }

  const { success } = signupLimiter.check(5, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { name, studioName, plan, customerId, paymentMethodId, promoCode } =
      await request.json()

    if (!studioName?.trim()) {
      return NextResponse.json({ error: 'Studio name is required' }, { status: 400 })
    }

    const displayName = name?.trim() || (user.user_metadata?.full_name as string | undefined) || user.email || 'there'
    const email = user.email ?? ''
    const selectedPlan = plan === 'pro' ? 'pro' : 'basic'

    // Defensive: ensure the user doesn't already own a studio. The UI only
    // shows this flow for users with no studio, but a duplicate POST would
    // otherwise create a second one.
    const { data: existing } = await adminSupabase
      .from('studio_members')
      .select('studio_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existing?.studio_id) {
      return NextResponse.json(
        { error: 'Account already has a studio. Please refresh the page.' },
        { status: 409 }
      )
    }

    // 1. Create studio
    const slug = await generateUniqueSlug(studioName)
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: studio, error: studioError } = await adminSupabase
      .from('studios')
      .insert({
        name: studioName.trim(),
        slug,
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
        is_agency: false,
        settings: { plan: selectedPlan, source: 'loyalink' },
      })
      .select()
      .single()

    if (studioError || !studio) {
      console.error('[onboarding/subscribe/complete] studio error:', studioError)
      return NextResponse.json({ error: 'Failed to create studio' }, { status: 500 })
    }

    // 2. Add owner membership
    const { error: memberError } = await adminSupabase.from('studio_members').insert({
      studio_id: studio.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      console.error('[onboarding/subscribe/complete] member error:', memberError)
      await adminSupabase.from('studios').delete().eq('id', studio.id)
      return NextResponse.json({ error: 'Failed to set up studio membership' }, { status: 500 })
    }

    // 3. Stripe subscription with flat base + metered member price
    if (process.env.STRIPE_SECRET_KEY && customerId && paymentMethodId) {
      try {
        const stripe = getStripe()

        const [, promo] = await Promise.all([
          stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }),
          resolvePromoCode(stripe, promoCode),
        ])

        const basePriceId = PLAN_PRICE_IDS[selectedPlan]
        const memberPriceId = process.env.STRIPE_MEMBER_PRICE_ID

        if (!basePriceId || !memberPriceId) {
          console.warn('[onboarding/subscribe/complete] Missing Stripe price IDs — skipping subscription')
        } else {
          const [, subscription] = await Promise.all([
            stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
              metadata: { studio_id: studio.id, studio_slug: slug, plan: selectedPlan, user_id: user.id },
            }),
            stripe.subscriptions.create({
              customer: customerId,
              items: [
                { price: basePriceId },
                { price: memberPriceId },
              ],
              default_payment_method: paymentMethodId,
              trial_period_days: TRIAL_DAYS,
              trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
              metadata: { studio_id: studio.id, plan: selectedPlan },
              ...(promo?.promotionCodeId
                ? { discounts: [{ promotion_code: promo.promotionCodeId }] }
                : promo?.coupon
                  ? { discounts: [{ coupon: promo.coupon.id }] }
                  : {}),
            }),
          ])

          await adminSupabase
            .from('studios')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', studio.id)
        }
      } catch (err) {
        console.error('[onboarding/subscribe/complete] Stripe error:', err)
        // Non-fatal — studio is created, Stripe can be linked later via billing portal
      }
    }

    // 4. Fire-and-forget welcome email
    if (email) {
      sendStudioWelcome(email, displayName, studioName, selectedPlan, trialEndsAt)
    }

    return NextResponse.json({ success: true, studioSlug: slug })
  } catch (error) {
    console.error('[onboarding/subscribe/complete] unhandled error:', error)
    return NextResponse.json({ error: 'Failed to finish onboarding' }, { status: 500 })
  }
}

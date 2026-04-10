import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { getResend, FROM } from '@/lib/resend'
import { PLATFORM_URL } from '@/lib/constants'
import { generateUniqueSlug } from '@/lib/slug'
import { signupLimiter, getIP } from '@/lib/rate-limit'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TRIAL_DAYS = 14

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

export async function POST(request: NextRequest) {
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
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: studio, error: studioError } = await supabase
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

    // 4. Stripe subscription with flat base + metered member price
    if (process.env.STRIPE_SECRET_KEY && customerId && paymentMethodId) {
      try {
        const stripe = getStripe()

        // Parallel: attach payment method + resolve promo code
        const couponPromise = promoCode?.trim()
          ? stripe.coupons.retrieve(promoCode.trim().toUpperCase()).catch(() => null)
          : Promise.resolve(null)

        const [, coupon] = await Promise.all([
          stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }),
          couponPromise,
        ])

        const couponId = coupon?.valid ? coupon.id : undefined

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
              trial_period_days: TRIAL_DAYS,
              trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
              metadata: { studio_id: studio.id, plan: selectedPlan },
              ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
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
    if (process.env.RESEND_API_KEY) {
      const appUrl = PLATFORM_URL
      const planLabel = selectedPlan === 'pro' ? 'Pro' : 'Basic'
      const trialEnd = new Date(trialEndsAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

      getResend().emails.send({
        from: FROM,
        to: email.trim(),
        subject: 'Welcome to Loyalink — your 14-day trial has started',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
            <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Welcome to Loyalink!</h2>
            <p style="color:#555;margin:0 0 16px">Hi ${name.trim()},</p>
            <p style="color:#555;margin:0 0 16px">
              Your studio <strong>${studioName.trim()}</strong> is ready on the <strong>${planLabel}</strong> plan.
              Your free 14-day trial runs until <strong>${trialEnd}</strong>.
            </p>
            <p style="margin:0 0 24px">
              <a href="${appUrl}/setup"
                 style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
                Complete setup →
              </a>
            </p>
            <p style="color:#888;font-size:13px">
              Questions? Reply to this email or visit
              <a href="mailto:hello@loyalink.ai" style="color:#555">hello@loyalink.ai</a>
            </p>
          </div>
        `,
      }).catch((err) => console.error('[signup/complete] welcome email error:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[signup/complete] unhandled error:', error)
    return NextResponse.json({ error: 'Failed to finish signup' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import type Stripe from 'stripe'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const subscription =
    event.type.startsWith('customer.subscription') || event.type === 'invoice.paid' || event.type === 'invoice.payment_failed'
      ? (event.data.object as Stripe.Subscription | Stripe.Invoice)
      : null

  // Resolve studio_id from subscription metadata
  async function getStudioId(): Promise<string | null> {
    if (!subscription) return null
    if ('metadata' in subscription && subscription.metadata?.studio_id) {
      return subscription.metadata.studio_id
    }
    // Fallback: look up by stripe_subscription_id
    const subId = 'subscription' in subscription ? subscription.subscription as string : (subscription as Stripe.Subscription).id
    if (!subId) return null
    const { data } = await supabase
      .from('studios')
      .select('id')
      .eq('stripe_subscription_id', subId)
      .single()
    return data?.id ?? null
  }

  switch (event.type) {
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const studioId = sub.metadata?.studio_id ?? (await getStudioId())
      if (!studioId) break

      let status: string
      switch (sub.status) {
        case 'trialing': status = 'trial'; break
        case 'active': status = 'active'; break
        case 'past_due': status = 'past_due'; break
        case 'canceled': status = 'cancelled'; break
        default: status = sub.status
      }

      await supabase
        .from('studios')
        .update({
          subscription_status: status,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        })
        .eq('id', studioId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const studioId = sub.metadata?.studio_id ?? (await getStudioId())
      if (studioId) {
        await supabase
          .from('studios')
          .update({ subscription_status: 'cancelled' })
          .eq('id', studioId)
      }
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      // In API version 2026+, subscription is nested under parent
      const subId = (invoice as unknown as { subscription?: string }).subscription
        ?? (invoice.parent as unknown as { subscription_details?: { subscription?: string } })?.subscription_details?.subscription
      if (subId) {
        const { data: studio } = await supabase
          .from('studios')
          .select('id, is_agency')
          .eq('stripe_subscription_id', subId)
          .single()
        if (studio && !studio.is_agency) {
          await supabase
            .from('studios')
            .update({ subscription_status: 'active' })
            .eq('id', studio.id)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = (invoice as unknown as { subscription?: string }).subscription
        ?? (invoice.parent as unknown as { subscription_details?: { subscription?: string } })?.subscription_details?.subscription
      if (subId) {
        const { data: studio } = await supabase
          .from('studios')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .single()
        if (studio) {
          await supabase
            .from('studios')
            .update({ subscription_status: 'past_due' })
            .eq('id', studio.id)
        }
      }
      break
    }

    default:
      // Unhandled event — ignore
      break
  }

  return NextResponse.json({ received: true })
}

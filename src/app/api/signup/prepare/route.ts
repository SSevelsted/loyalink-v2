import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const { email, studioName } = await request.json()

  if (!email?.trim() || !studioName?.trim()) {
    return NextResponse.json({ error: 'email and studioName are required' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  try {
    const customer = await getStripe().customers.create({
      email: email.trim(),
      name: studioName.trim(),
      metadata: { source: 'self_signup' },
    })

    const setupIntent = await getStripe().setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: { studio_name: studioName.trim() },
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    })
  } catch (err) {
    console.error('[signup/prepare]', err)
    return NextResponse.json({ error: 'Failed to initialize payment setup' }, { status: 500 })
  }
}

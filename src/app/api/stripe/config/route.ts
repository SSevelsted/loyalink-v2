import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
  const billingEnabled = Boolean(publishableKey && process.env.STRIPE_SECRET_KEY)

  return NextResponse.json({
    billingEnabled,
    publishableKey,
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

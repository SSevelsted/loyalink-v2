import { NextRequest, NextResponse } from 'next/server'
import { PASS_SERVICE_URL } from '@/lib/constants'

// Webhook called when a customer's balance changes
// Triggers a pass update push notification
export async function POST(request: NextRequest) {
  const { customerId, studioId } = await request.json()

  if (!customerId || !studioId) {
    return NextResponse.json({ error: 'Missing customerId or studioId' }, { status: 400 })
  }

  try {
    // Notify pass service to push update
    const res = await fetch(`${PASS_SERVICE_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioId,
        targetType: 'customer',
        customerId,
      }),
    })

    if (!res.ok) {
      console.error('Failed to send push:', await res.text())
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

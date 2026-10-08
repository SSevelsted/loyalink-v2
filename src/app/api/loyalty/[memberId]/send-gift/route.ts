import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken } from '@/lib/customer-access'
import { getIP, referralLimiter } from '@/lib/rate-limit'
import { sendGiftToFriend } from '@/lib/services/send-gift-service'

/**
 * POST /api/loyalty/:memberId/send-gift  { firstName, phone (E.164) }
 * Authorization: Bearer <the private member page token>
 *
 * Sends referral.friend_sent to the studio's webhooks. Creates no member.
 * Errors: 400 invalid_name | invalid_phone | self, 401, 404,
 * 409 referrals_disabled | no_webhook, 429 daily_limit, 502 delivery_failed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  // Burst guard per IP; the daily limit per member is durable (see the service).
  if (!referralLimiter.check(20, getIP(request)).success) {
    return NextResponse.json({ error: 'rate_limited', message: 'Too many requests' }, { status: 429 })
  }

  const { memberId } = await params
  const body = (await request.json().catch(() => null)) as { firstName?: unknown; phone?: unknown } | null
  const result = await sendGiftToFriend({
    memberId,
    token: getBearerToken(request.headers.get('authorization')),
    firstName: body?.firstName,
    phone: body?.phone,
  })

  if (result.status === 200) return NextResponse.json({ sent: true, sent_at: result.payload.sent_at })
  return NextResponse.json({ error: result.error, message: result.message }, { status: result.status })
}

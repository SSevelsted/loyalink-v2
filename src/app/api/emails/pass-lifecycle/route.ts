import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sendPassRemoved, sendPassReminder } from '@/lib/email/send'

function verifyInternalSecret(headerValue: string | null): boolean {
  const expected = process.env.PASS_SERVICE_SECRET
  if (!expected || !headerValue) return false

  const a = Buffer.from(headerValue)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-loyalink-internal-secret')
    if (!verifyInternalSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, customerId, studioId } = await request.json()

    if (!customerId || !studioId || !type) {
      return NextResponse.json({ error: 'type, customerId, and studioId are required' }, { status: 400 })
    }

    if (type === 'pass_uninstalled') {
      await sendPassRemoved(customerId, studioId)
      return NextResponse.json({ success: true, type: 'pass_uninstalled' })
    }

    if (type === 'pass_reminder') {
      await sendPassReminder(customerId, studioId)
      return NextResponse.json({ success: true, type: 'pass_reminder' })
    }

    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

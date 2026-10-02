import { NextRequest, NextResponse } from 'next/server'
import { lookupInvitation } from '@/lib/services/invitation-service'
import { invitationLimiter, getIP } from '@/lib/rate-limit'

// The invite page's preview of one invitation: studio name, role, email.
// The token travels in the body, not the URL, so it stays out of access logs.
export async function POST(request: NextRequest) {
  const { success } = invitationLimiter.check(20, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let token: unknown
  try {
    ;({ token } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const result = await lookupInvitation(token)
  if (result.status === 'expired') {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }
  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }
  return NextResponse.json(result.invitation)
}

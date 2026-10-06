import { NextRequest, NextResponse } from 'next/server'
import { createMember, DuplicateMemberError } from '@/lib/services/member-service'
import { joinLimiter, getIP } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const { success } = joinLimiter.check(10, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { studioId, landingPageId, name, email, phone, platform, referralCode, customFields } = await request.json()

    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (!studioId || !cleanName) {
      return NextResponse.json({ error: 'studioId and name are required' }, { status: 400 })
    }

    // Email is optional (the friend landing page asks for name and phone
    // only). Empty means none; a given email must look like one.
    const cleanEmail = typeof email === 'string' && email.trim() ? email.trim() : null
    if (cleanEmail && (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 320)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null

    const result = await createMember({
      studioId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      platform,
      referralCode,
      customFields,
      landingPageId,
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof DuplicateMemberError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

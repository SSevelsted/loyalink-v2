import { NextRequest, NextResponse } from 'next/server'
import { createMember, DuplicateMemberError } from '@/lib/services/member-service'

export async function POST(request: NextRequest) {
  try {
    const { studioId, landingPageId, name, email, phone, platform, referralCode, customFields } = await request.json()

    if (!studioId || !name) {
      return NextResponse.json({ error: 'studioId and name are required' }, { status: 400 })
    }

    const result = await createMember({
      studioId,
      name,
      email,
      phone,
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

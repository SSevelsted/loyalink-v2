import { NextRequest, NextResponse } from 'next/server'
import { anonSupabase as supabase } from '@/lib/studio-access'
import { sendResendPassLink } from '@/lib/email/send'
import { resendPassLimiter, getIP } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const { success } = resendPassLimiter.check(3, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { studioId, email } = await request.json()

    if (!studioId || !email) {
      return NextResponse.json({ error: 'studioId and email are required' }, { status: 400 })
    }

    // Always return success to avoid leaking whether the email exists
    const ok = NextResponse.json({ success: true })

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId)
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (!customer) return ok

    await sendResendPassLink(customer.id, studioId).catch(() => {})

    return ok
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

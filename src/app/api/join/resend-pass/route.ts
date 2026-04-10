import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCustomerAccessToken } from '@/lib/customer-access'
import { getResend, FROM } from '@/lib/resend'
import { MARKETING_URL } from '@/lib/constants'
import { escapeHtml } from '@/lib/escape-html'
import { resendPassLimiter, getIP } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      .select('id, name, member_id, studio_id')
      .eq('studio_id', studioId)
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (!customer) return ok

    // Get studio name for the email
    const { data: studio } = await supabase
      .from('studios')
      .select('name')
      .eq('id', studioId)
      .single()

    const studioName = escapeHtml(studio?.name ?? 'your loyalty program')

    // Generate a 24h access token
    const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)
    const memberId = customer.member_id || customer.id
    const passLink = `${MARKETING_URL}/loyalty/${memberId}?addPass=1&token=${token}`

    if (!process.env.RESEND_API_KEY) {
      console.error('[join/resend-pass] RESEND_API_KEY not configured')
      return ok
    }

    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Add your ${studioName} loyalty card`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Your loyalty card is ready</h2>
          <p style="color:#555;margin:0 0 16px">Hi ${escapeHtml(customer.name ?? '')},</p>
          <p style="color:#555;margin:0 0 16px">
            Tap the button below on your phone to add your <strong>${studioName}</strong> loyalty card to your wallet.
          </p>
          <p style="margin:0 0 24px">
            <a href="${escapeHtml(passLink)}"
               style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
              Add to Wallet →
            </a>
          </p>
          <p style="color:#888;font-size:13px">
            This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    return ok
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

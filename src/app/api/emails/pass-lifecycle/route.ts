import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend, FROM } from '@/lib/resend'
import { createCustomerAccessToken } from '@/lib/customer-access'
import { MARKETING_URL } from '@/lib/constants'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifyInternalSecret(headerValue: string | null): boolean {
  const expected = process.env.PASS_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!expected || !headerValue) return false
  return headerValue === expected
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

    // Fetch customer and studio
    const [{ data: customer }, { data: studio }] = await Promise.all([
      supabase.from('customers').select('name, email, member_id, id').eq('id', customerId).single(),
      supabase.from('studios').select('name').eq('id', studioId).single(),
    ])

    if (!customer?.email) {
      return NextResponse.json({ skipped: true, reason: 'no_email' })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ skipped: true, reason: 'resend_not_configured' })
    }

    const studioName = studio?.name ?? 'your studio'
    const memberId = customer.member_id || customer.id
    const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)
    const passLink = `${MARKETING_URL}/loyalty/${memberId}?addPass=1&token=${token}`

    if (type === 'pass_uninstalled') {
      await getResend().emails.send({
        from: FROM,
        to: customer.email,
        subject: `Your ${studioName} loyalty card`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
            <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">We noticed you removed your loyalty card</h2>
            <p style="color:#555;margin:0 0 16px">Hi ${customer.name},</p>
            <p style="color:#555;margin:0 0 16px">
              It looks like you removed your <strong>${studioName}</strong> loyalty card from your wallet.
              Your balance and rewards are still safe — you can re-add it anytime with one tap.
            </p>
            <p style="margin:0 0 24px">
              <a href="${passLink}"
                 style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
                Re-add to Wallet &rarr;
              </a>
            </p>
            <p style="color:#888;font-size:13px">
              This link expires in 24 hours. If you removed the card intentionally, you can safely ignore this email.
            </p>
          </div>
        `,
      })

      return NextResponse.json({ success: true, type: 'pass_uninstalled' })
    }

    if (type === 'pass_reminder') {
      await getResend().emails.send({
        from: FROM,
        to: customer.email,
        subject: `Your ${studioName} loyalty card is waiting`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
            <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Don't forget your loyalty card</h2>
            <p style="color:#555;margin:0 0 16px">Hi ${customer.name},</p>
            <p style="color:#555;margin:0 0 16px">
              Your <strong>${studioName}</strong> loyalty card is ready to be added to your wallet.
              Add it now to start earning rewards on every visit.
            </p>
            <p style="margin:0 0 24px">
              <a href="${passLink}"
                 style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
                Add to Wallet &rarr;
              </a>
            </p>
            <p style="color:#888;font-size:13px">
              This link expires in 24 hours.
            </p>
          </div>
        `,
      })

      return NextResponse.json({ success: true, type: 'pass_reminder' })
    }

    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Cron: runs daily at 10:00 UTC
 * Sends reminder emails to customers who signed up 24–48h ago but never installed their wallet pass.
 *
 * Vercel cron config in vercel.json:
 *   { "path": "/api/cron/pass-reminders", "schedule": "0 10 * * *" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResend, FROM } from '@/lib/resend'
import { createCustomerAccessToken } from '@/lib/customer-access'
import { MARKETING_URL } from '@/lib/constants'
import { verifyCronSecret } from '@/lib/cron'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'Resend not configured' })
  }

  const now = Date.now()
  const ago48h = new Date(now - 48 * 60 * 60 * 1000).toISOString()
  const ago24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  // Find passes that were created 24–48h ago and are still in 'active' status (never installed)
  const { data: passes, error } = await supabase
    .from('wallet_passes')
    .select('id, customer_id, studio_id, customers!inner(email, name, member_id, id), studios!inner(name)')
    .eq('status', 'active')
    .gte('created_at', ago48h)
    .lt('created_at', ago24h)
    .not('customers.email', 'is', null)

  if (error) {
    console.error('[pass-reminders] query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const results: { customerId: string; status: string }[] = []

  for (const pass of passes ?? []) {
    try {
      const customer = pass.customers as unknown as { email: string; name: string; member_id: string | null; id: string }
      const studio = pass.studios as unknown as { name: string }

      if (!customer.email) {
        results.push({ customerId: pass.customer_id, status: 'no_email' })
        continue
      }

      const memberId = customer.member_id || customer.id
      const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)
      const passLink = `${MARKETING_URL}/loyalty/${memberId}?addPass=1&token=${token}`
      const studioName = studio.name

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

      results.push({ customerId: pass.customer_id, status: 'sent' })
    } catch (err) {
      console.error(`[pass-reminders] error for customer ${pass.customer_id}:`, err)
      results.push({ customerId: pass.customer_id, status: 'error' })
    }
  }

  return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getResend, FROM } from '@/lib/resend'
import { escapeHtml } from '@/lib/escape-html'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const {
      customerId,
      studioId,
      amount,
      chargeOnPOS,
      balanceUsed,
      cashbackEarned,
      cashbackRate,
      newBalance,
      tierName,
      tierUpgraded,
      newTierName,
      currency,
    } = await request.json()

    if (!customerId || !studioId) {
      return NextResponse.json({ error: 'customerId and studioId are required' }, { status: 400 })
    }

    // Auth check
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('studio_members')
      .select('id')
      .eq('studio_id', studioId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch customer + studio
    const [{ data: customer }, { data: studio }] = await Promise.all([
      supabase.from('customers').select('name, email').eq('id', customerId).single(),
      supabase.from('studios').select('name').eq('id', studioId).single(),
    ])

    if (!customer?.email) {
      return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 })
    }

    const studioName = escapeHtml(studio?.name ?? 'your studio')
    const sym = escapeHtml(currency ?? 'kr')
    const fmt = (n: number) => `${Math.round(n)} ${sym}`

    // Build breakdown rows
    const rows: string[] = []
    rows.push(`<tr><td style="padding:6px 0;color:#555">Purchase amount</td><td style="padding:6px 0;text-align:right;font-weight:600">${fmt(amount)}</td></tr>`)
    if (balanceUsed > 0) {
      rows.push(`<tr><td style="padding:6px 0;color:#555">Balance redeemed</td><td style="padding:6px 0;text-align:right;color:#10B981;font-weight:500">-${fmt(balanceUsed)}</td></tr>`)
    }
    if (chargeOnPOS != null && chargeOnPOS !== amount) {
      rows.push(`<tr><td style="padding:6px 0;color:#555">Charged on POS</td><td style="padding:6px 0;text-align:right;font-weight:600">${fmt(chargeOnPOS)}</td></tr>`)
    }
    if (cashbackEarned > 0) {
      rows.push(`<tr><td style="padding:6px 0;color:#555">Cashback earned (${escapeHtml(String(cashbackRate))}%)</td><td style="padding:6px 0;text-align:right;color:#10B981;font-weight:500">+${fmt(cashbackEarned)}</td></tr>`)
    }
    rows.push(`<tr style="border-top:1px solid #eee"><td style="padding:8px 0 0;font-weight:600">Your balance</td><td style="padding:8px 0 0;text-align:right;font-weight:700">${fmt(newBalance)}</td></tr>`)

    const tierHtml = tierUpgraded && newTierName
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:0 0 20px;text-align:center">
           <p style="margin:0;font-weight:600;color:#16a34a">You've been upgraded to ${escapeHtml(newTierName)}!</p>
         </div>`
      : ''

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">Your receipt from ${studioName}</h2>
        <p style="color:#888;font-size:13px;margin:0 0 20px">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        ${tierHtml}

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${rows.join('')}
        </table>

        <p style="color:#555;margin:20px 0 0;font-size:14px">
          Your current tier: <strong>${escapeHtml(tierUpgraded ? newTierName : tierName)}</strong>
        </p>

        <p style="color:#888;font-size:13px;margin:24px 0 0">
          Thank you for being a loyal customer at ${studioName}.
        </p>
      </div>
    `

    await getResend().emails.send({
      from: FROM,
      to: customer.email,
      subject: `Your receipt from ${studioName}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send receipt' }, { status: 500 })
  }
}

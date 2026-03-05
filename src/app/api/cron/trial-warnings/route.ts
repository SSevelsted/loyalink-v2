/**
 * Cron: runs daily at 09:00 UTC
 * Sends trial expiry warning emails to studio owners at 5 days and 1 day before expiry.
 *
 * Vercel cron config in vercel.json:
 *   { "path": "/api/cron/trial-warnings", "schedule": "0 9 * * *" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getResend, FROM } from '@/lib/resend'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function sendWarningEmail(
  ownerEmail: string,
  ownerName: string,
  studioName: string,
  planLabel: string,
  daysLeft: number
) {
  const subject =
    daysLeft === 1
      ? `Your Loyalink trial ends tomorrow`
      : `${daysLeft} days left in your Loyalink trial`

  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">
        ${daysLeft === 1 ? 'Your trial ends tomorrow' : `${daysLeft} days left in your free trial`}
      </h2>
      <p style="color:#555;margin:0 0 16px">Hi ${ownerName},</p>
      <p style="color:#555;margin:0 0 16px">
        Your Loyalink <strong>${planLabel}</strong> trial for <strong>${studioName}</strong> ends in
        <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.
        After that, your studio will be paused until you add a payment method.
      </p>
      <p style="margin:0 0 24px">
        <a href="${APP_URL}/settings?tab=billing"
           style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
          Manage billing →
        </a>
      </p>
      <p style="color:#888;font-size:13px">
        Questions? Reply to this email or contact us at
        <a href="mailto:hello@loyalink.ai" style="color:#555">hello@loyalink.ai</a>
      </p>
    </div>
  `

  await getResend().emails.send({
    from: FROM,
    to: ownerEmail,
    subject,
    html: body,
  })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'Resend not configured' })
  }

  const now = new Date()

  // Build date strings for 5 days and 1 day from now (UTC date)
  const in5Days = new Date(now)
  in5Days.setUTCDate(in5Days.getUTCDate() + 5)
  const in5DaysStr = in5Days.toISOString().slice(0, 10)

  const in1Day = new Date(now)
  in1Day.setUTCDate(in1Day.getUTCDate() + 1)
  const in1DayStr = in1Day.toISOString().slice(0, 10)

  const results: { studioId: string; name: string; daysLeft: number; status: string }[] = []

  for (const { daysLeft, dateStr } of [
    { daysLeft: 5, dateStr: in5DaysStr },
    { daysLeft: 1, dateStr: in1DayStr },
  ]) {
    const { data: studios, error } = await supabase
      .from('studios')
      .select('id, name, settings')
      .eq('subscription_status', 'trial')
      .gte('trial_ends_at', `${dateStr}T00:00:00.000Z`)
      .lt('trial_ends_at', `${dateStr}T23:59:59.999Z`)

    if (error) {
      console.error(`[trial-warnings] query error for daysLeft=${daysLeft}:`, error)
      continue
    }

    for (const studio of studios ?? []) {
      try {
        // Find owner membership
        const { data: ownerMember } = await supabase
          .from('studio_members')
          .select('user_id')
          .eq('studio_id', studio.id)
          .eq('role', 'owner')
          .limit(1)
          .maybeSingle()

        if (!ownerMember) {
          results.push({ studioId: studio.id, name: studio.name, daysLeft, status: 'no_owner' })
          continue
        }

        // Get user email via admin API
        const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(ownerMember.user_id)
        if (!ownerUser?.email) {
          results.push({ studioId: studio.id, name: studio.name, daysLeft, status: 'no_email' })
          continue
        }

        const settings = studio.settings as Record<string, unknown>
        const plan = settings?.plan as string | undefined
        const planLabel = plan === 'pro' ? 'Pro' : 'Basic'
        const ownerName = (ownerUser.user_metadata?.full_name as string | undefined) ?? ownerUser.email.split('@')[0]

        await sendWarningEmail(ownerUser.email, ownerName, studio.name, planLabel, daysLeft)
        results.push({ studioId: studio.id, name: studio.name, daysLeft, status: 'sent' })
      } catch (err) {
        console.error(`[trial-warnings] error for studio ${studio.id}:`, err)
        results.push({ studioId: studio.id, name: studio.name, daysLeft, status: 'error' })
      }
    }
  }

  return NextResponse.json({ sent: results.filter((r) => r.status === 'sent').length, results })
}

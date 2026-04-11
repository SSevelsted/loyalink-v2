/**
 * Cron: runs daily at 09:00 UTC
 * Sends trial expiry warning emails (5 days + 1 day before) and trial expired emails.
 * Variant A/B based on whether the studio has a payment method on file.
 *
 * Vercel cron config in vercel.json:
 *   { "path": "/api/cron/trial-warnings", "schedule": "0 9 * * *" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifyCronSecret } from '@/lib/cron'
import { sendTrialWarning, sendTrialExpired } from '@/lib/email/send'

const supabase = createAdminClient(
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

  const now = new Date()
  const results: { studioId: string; name: string; type: string; status: string }[] = []

  // Build date strings for 5 days, 1 day from now, and yesterday (expired)
  const in5Days = new Date(now)
  in5Days.setUTCDate(in5Days.getUTCDate() + 5)
  const in5DaysStr = in5Days.toISOString().slice(0, 10)

  const in1Day = new Date(now)
  in1Day.setUTCDate(in1Day.getUTCDate() + 1)
  const in1DayStr = in1Day.toISOString().slice(0, 10)

  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // Trial warnings: 5 days and 1 day
  for (const { daysLeft, dateStr } of [
    { daysLeft: 5 as const, dateStr: in5DaysStr },
    { daysLeft: 1 as const, dateStr: in1DayStr },
  ]) {
    const { data: studios, error } = await supabase
      .from('studios')
      .select('id, name')
      .eq('subscription_status', 'trial')
      .gte('trial_ends_at', `${dateStr}T00:00:00.000Z`)
      .lt('trial_ends_at', `${dateStr}T23:59:59.999Z`)

    if (error) {
      console.error(`[trial-warnings] query error for daysLeft=${daysLeft}:`, error)
      continue
    }

    for (const studio of studios ?? []) {
      try {
        const result = await sendTrialWarning(studio.id, daysLeft)
        results.push({ studioId: studio.id, name: studio.name, type: `warning_${daysLeft}d`, status: result.status })
      } catch (err) {
        console.error(`[trial-warnings] error for studio ${studio.id}:`, err)
        results.push({ studioId: studio.id, name: studio.name, type: `warning_${daysLeft}d`, status: 'error' })
      }
    }
  }

  // Trial expired: trial ended yesterday, still in trial status
  const { data: expiredStudios, error: expiredError } = await supabase
    .from('studios')
    .select('id, name')
    .eq('subscription_status', 'trial')
    .gte('trial_ends_at', `${yesterdayStr}T00:00:00.000Z`)
    .lt('trial_ends_at', `${yesterdayStr}T23:59:59.999Z`)

  if (expiredError) {
    console.error('[trial-warnings] expired query error:', expiredError)
  }

  for (const studio of expiredStudios ?? []) {
    try {
      const result = await sendTrialExpired(studio.id)
      results.push({ studioId: studio.id, name: studio.name, type: 'expired', status: result.status })
    } catch (err) {
      console.error(`[trial-warnings] expired error for studio ${studio.id}:`, err)
      results.push({ studioId: studio.id, name: studio.name, type: 'expired', status: 'error' })
    }
  }

  return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results })
}

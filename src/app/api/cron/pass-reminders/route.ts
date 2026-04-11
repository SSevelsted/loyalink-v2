/**
 * Cron: runs daily at 10:00 UTC
 * Sends reminder emails to customers who signed up 24-48h ago but never installed their wallet pass.
 *
 * Vercel cron config in vercel.json:
 *   { "path": "/api/cron/pass-reminders", "schedule": "0 10 * * *" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronSecret } from '@/lib/cron'
import { sendPassReminder } from '@/lib/email/send'

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

  // Find passes that were created 24-48h ago and are still in 'active' status (never installed)
  const { data: passes, error } = await supabase
    .from('wallet_passes')
    .select('id, customer_id, studio_id')
    .eq('status', 'active')
    .gte('created_at', ago48h)
    .lt('created_at', ago24h)

  if (error) {
    console.error('[pass-reminders] query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const results: { customerId: string; status: string }[] = []

  for (const pass of passes ?? []) {
    try {
      await sendPassReminder(pass.customer_id, pass.studio_id)
      results.push({ customerId: pass.customer_id, status: 'sent' })
    } catch (err) {
      console.error(`[pass-reminders] error for customer ${pass.customer_id}:`, err)
      results.push({ customerId: pass.customer_id, status: 'error' })
    }
  }

  return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, results })
}

import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifySuperAdmin } from '@/lib/studio-access'
import { generateTrialCode, MAX_TRIAL_DAYS } from '@/lib/trial-codes'
import { PLATFORM_URL } from '@/lib/constants'
import type { TrialCode } from '@/types/database'

export type AdminTrialCode = TrialCode & {
  signup_url: string
  studios: { name: string; slug: string } | null
}

function withSignupUrl<T extends TrialCode>(row: T): T & { signup_url: string } {
  return { ...row, signup_url: `${PLATFORM_URL}/signup?code=${encodeURIComponent(row.code)}` }
}

/** GET /api/admin/trial-codes — newest first, with the redeeming studio when used */
export async function GET() {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminSupabase
    .from('trial_codes')
    .select('*, studios(name, slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/trial-codes] list error:', error)
    return NextResponse.json({ error: 'Failed to load trial codes' }, { status: 500 })
  }

  const codes = (data as unknown as Array<TrialCode & { studios: AdminTrialCode['studios'] }>).map(withSignupUrl)
  return NextResponse.json(codes)
}

/**
 * POST /api/admin/trial-codes
 * Body: { trialDays: number; note?: string; expiresInDays?: number | null }
 * Mints one single-use code. Retries on the (astronomically unlikely) code collision.
 */
export async function POST(request: NextRequest) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    trialDays?: unknown
    note?: unknown
    expiresInDays?: unknown
  }

  const trialDays = Number(body.trialDays)
  if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > MAX_TRIAL_DAYS) {
    return NextResponse.json({ error: `trialDays must be a whole number between 1 and ${MAX_TRIAL_DAYS}` }, { status: 400 })
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) || null : null

  let expiresAt: string | null = null
  if (body.expiresInDays != null && body.expiresInDays !== '') {
    const expiresInDays = Number(body.expiresInDays)
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
      return NextResponse.json({ error: 'expiresInDays must be a whole number between 1 and 365' }, { status: 400 })
    }
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await adminSupabase
      .from('trial_codes')
      .insert({
        code: generateTrialCode(trialDays),
        trial_days: trialDays,
        note,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select('*, studios(name, slug)')
      .single()

    if (!error && data) {
      return NextResponse.json(withSignupUrl(data as unknown as AdminTrialCode), { status: 201 })
    }
    if (error?.code !== '23505') {
      console.error('[admin/trial-codes] create error:', error)
      return NextResponse.json({ error: 'Failed to create trial code' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Failed to generate a unique code, please retry' }, { status: 500 })
}

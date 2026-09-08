import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifySuperAdmin } from '@/lib/studio-access'
import { generateTrialCode, isValidCustomCode, MAX_TRIAL_DAYS, normalizeTrialCode } from '@/lib/trial-codes'
import { MARKETING_URL, PLATFORM_URL } from '@/lib/constants'
import type { TrialCode } from '@/types/database'

const MAX_USES_LIMIT = 10_000

export type TrialCodeRedemptionSummary = {
  redeemed_at: string
  email: string | null
  studios: { name: string; slug: string } | null
}

export type AdminTrialCode = TrialCode & {
  signup_url: string
  short_url: string
  trial_code_redemptions: TrialCodeRedemptionSummary[]
}

function withUrls<T extends TrialCode>(row: T): T & { signup_url: string; short_url: string } {
  const encoded = encodeURIComponent(row.code)
  return {
    ...row,
    signup_url: `${PLATFORM_URL}/signup?code=${encoded}`,
    short_url: `${MARKETING_URL}/trial/${encoded}`,
  }
}

/** GET /api/admin/trial-codes — newest first, with recent redemptions */
export async function GET() {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminSupabase
    .from('trial_codes')
    .select('*, trial_code_redemptions(redeemed_at, email, studios(name, slug))')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/trial-codes] list error:', error)
    return NextResponse.json({ error: 'Failed to load trial codes' }, { status: 500 })
  }

  const codes = (data as unknown as AdminTrialCode[]).map((row) => ({
    ...withUrls(row),
    trial_code_redemptions: [...(row.trial_code_redemptions ?? [])].sort(
      (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime()
    ),
  }))

  return NextResponse.json(codes)
}

/**
 * POST /api/admin/trial-codes
 * Body: { trialDays, note?, expiresInDays?, maxUses?, code? }
 *
 * maxUses defaults to 1 (a lead-specific code); pass null for a campaign code
 * that many people can redeem. A custom `code` gives the link a readable tail.
 */
export async function POST(request: NextRequest) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

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

  // undefined → single use (the 025 behaviour); explicit null → unlimited.
  let maxUses: number | null = 1
  if (body.maxUses === null || body.maxUses === '') {
    maxUses = null
  } else if (body.maxUses !== undefined) {
    const parsed = Number(body.maxUses)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_USES_LIMIT) {
      return NextResponse.json({ error: `maxUses must be a whole number between 1 and ${MAX_USES_LIMIT}, or empty for unlimited` }, { status: 400 })
    }
    maxUses = parsed
  }

  const customCode = typeof body.code === 'string' ? normalizeTrialCode(body.code) : ''
  if (customCode && !isValidCustomCode(customCode)) {
    return NextResponse.json(
      { error: 'Custom codes use 3-32 letters, digits or hyphens, e.g. RESOURCES45' },
      { status: 400 }
    )
  }

  const attempts = customCode ? 1 : 3
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { data, error } = await adminSupabase
      .from('trial_codes')
      .insert({
        code: customCode || generateTrialCode(trialDays),
        trial_days: trialDays,
        note,
        expires_at: expiresAt,
        max_uses: maxUses,
        created_by: user.id,
      })
      .select('*, trial_code_redemptions(redeemed_at, email, studios(name, slug))')
      .single()

    if (!error && data) {
      return NextResponse.json(withUrls(data as unknown as AdminTrialCode), { status: 201 })
    }
    if (error?.code === '23505' && customCode) {
      return NextResponse.json({ error: `Code ${customCode} already exists` }, { status: 409 })
    }
    if (error?.code !== '23505') {
      console.error('[admin/trial-codes] create error:', error)
      return NextResponse.json({ error: 'Failed to create trial code' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Failed to generate a unique code, please retry' }, { status: 500 })
}

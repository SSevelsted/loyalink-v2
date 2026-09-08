import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { DEFAULT_TRIAL_DAYS, lookupTrialCode, trialCodeErrorMessage } from '@/lib/trial-codes'
import { signupLimiter, getIP } from '@/lib/rate-limit'

/**
 * GET /api/trial-codes/validate?code=TRIAL45-XXXX
 *
 * Public, read-only. The signup page calls this on load so a visitor arriving
 * from a campaign link sees the real trial length in the copy instead of the
 * default 14 days. Returns only a boolean and the day count — never the note,
 * the cap, or who redeemed it — and is rate limited to blunt enumeration.
 */
export async function GET(request: NextRequest) {
  const { success } = signupLimiter.check(20, getIP(request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code?.trim()) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const lookup = await lookupTrialCode(adminSupabase, code)

  if (lookup.kind === 'valid') {
    return NextResponse.json({
      valid: true,
      kind: 'valid',
      code: lookup.code.code,
      trialDays: lookup.code.trial_days,
    })
  }

  if (lookup.kind === 'invalid') {
    return NextResponse.json({
      valid: false,
      kind: lookup.status,
      reason: trialCodeErrorMessage(lookup.status, lookup.code),
      trialDays: DEFAULT_TRIAL_DAYS,
    })
  }

  // Not one of ours. It may still be a valid Stripe promotion code, so the
  // caller must not present this as an error.
  return NextResponse.json({ valid: false, kind: 'unknown', trialDays: DEFAULT_TRIAL_DAYS })
}

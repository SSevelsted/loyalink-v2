import { NextRequest, NextResponse } from 'next/server'
import { PLATFORM_URL } from '@/lib/constants'
import { normalizeTrialCode } from '@/lib/trial-codes'

/**
 * GET /trial/<code> — the short link behind a campaign call to action.
 *
 * Served on both loyalink.ai and my.loyalink.ai, so a marketing page can link
 * to /trial/RESOURCES45 and land the visitor on signup with the code applied.
 * Deliberately does not validate the code: the signup page reports a bad or
 * exhausted code far better than a redirect can, and this stays a cheap hop.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const normalized = normalizeTrialCode(decodeURIComponent(code))

  const target = new URL('/signup', PLATFORM_URL)
  if (normalized) target.searchParams.set('code', normalized)

  return NextResponse.redirect(target, 307)
}

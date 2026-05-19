import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Verifies a Supabase OTP token and establishes the session.
//
// POST only — on purpose. The email links point at /auth/verify, which
// renders a button that POSTs here. Keeping this route POST-only means a
// mail-client link prefetcher (which only ever issues GETs) can never burn
// the single-use token.

const ALLOWED_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

function getSafeRedirect(next: string | null): string {
  if (!next) return '/overview'
  if (!next.startsWith('/') || next.startsWith('//')) return '/overview'
  return next
}

function getSafeOtpType(type: string | null): EmailOtpType | null {
  if (!type || !ALLOWED_TYPES.has(type as EmailOtpType)) return null
  return type as EmailOtpType
}

function getRecoveryFallbackUrl(request: NextRequest) {
  const url = new URL('/reset-password', request.url)
  url.searchParams.set('expired', 'true')
  return url
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const tokenHash = String(formData.get('token_hash') ?? '')
  const type = getSafeOtpType(String(formData.get('type') ?? ''))
  const next = getSafeRedirect(String(formData.get('next') ?? ''))

  if (!tokenHash || !type) {
    return NextResponse.redirect(getRecoveryFallbackUrl(request), 303)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    if (type === 'recovery') {
      return NextResponse.redirect(getRecoveryFallbackUrl(request), 303)
    }

    return NextResponse.redirect(new URL('/login?error=auth_confirm_failed', request.url), 303)
  }

  return NextResponse.redirect(new URL(next, request.url), 303)
}

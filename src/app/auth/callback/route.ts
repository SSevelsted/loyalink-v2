import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Only allow redirects to local paths (no open redirect)
function getSafeRedirect(next: string | null): string {
  if (!next) return '/overview'
  // Must start with / and not // (protocol-relative URL)
  if (!next.startsWith('/') || next.startsWith('//')) return '/overview'
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const next = getSafeRedirect(searchParams.get('next'))
  const resetPasswordFallbackUrl = new URL('/reset-password', request.url)
  resetPasswordFallbackUrl.searchParams.set('expired', 'true')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }

    if (next === '/reset-password') {
      return NextResponse.redirect(resetPasswordFallbackUrl)
    }
  }

  if (next === '/reset-password') {
    return NextResponse.redirect(resetPasswordFallbackUrl)
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
}

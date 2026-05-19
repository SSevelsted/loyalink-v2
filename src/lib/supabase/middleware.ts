import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isNativeRequest } from '@/lib/native-request'

// Business-account registration / paid subscription flows are blocked on the
// native app shell (App Store guideline 3.1.1).
const NATIVE_BLOCKED_PATHS = ['/signup', '/onboarding/subscribe']

function isNativeBlockedPath(path: string): boolean {
  return NATIVE_BLOCKED_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  )
}

// Paths that only exist on the marketing domain (loyalink.ai)
function isMarketingOnlyRoute(path: string): boolean {
  return (
    path === '/' ||
    path.startsWith('/about') ||
    path.startsWith('/blog') ||
    path.startsWith('/privacy') ||
    path.startsWith('/terms') ||
    path.startsWith('/v2')
  )
}

// Paths that only exist on the platform domain (my.loyalink.ai)
function isPlatformOnlyRoute(path: string): boolean {
  return (
    path.startsWith('/overview') ||
    path.startsWith('/analytics') ||
    path.startsWith('/customers') ||
    path.startsWith('/transactions') ||
    path.startsWith('/notifications') ||
    path.startsWith('/wallet') ||
    path.startsWith('/stories') ||
    path.startsWith('/settings') ||
    path.startsWith('/support') ||
    path.startsWith('/admin') ||
    path.startsWith('/scan') ||
    path.startsWith('/setup') ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/invite') ||
    path.startsWith('/auth')
  )
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '')
}

export async function updateSession(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const path = request.nextUrl.pathname

  const marketingHost = stripProtocol(process.env.NEXT_PUBLIC_MARKETING_URL ?? '')
  const platformHost  = stripProtocol(process.env.NEXT_PUBLIC_PLATFORM_URL ?? '')

  const isMarketing = !!marketingHost && host === marketingHost
  const isPlatform  = !!platformHost && host === platformHost
  const hasDomainSplit = marketingHost !== platformHost && (isMarketing || isPlatform)

  // --- Catch Supabase auth errors (e.g. expired OTP links) on root ---
  if (path === '/' && request.nextUrl.searchParams.get('error_code') === 'otp_expired') {
    const url = new URL('/reset-password', request.nextUrl.origin)
    url.searchParams.set('expired', 'true')
    return NextResponse.redirect(url)
  }

  // --- Block business-account registration on native (App Store 3.1.1) ---
  // Native shell must not reach any signup/subscription routes OR any marketing
  // pages (which contain pricing + signup CTAs). Anything marketing-flavored
  // gets bounced into /login so Apple's reviewer can never land on it.
  if (isNativeRequest(request)) {
    if (isNativeBlockedPath(path) || isMarketingOnlyRoute(path)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // --- Domain-based routing (only in production with two domains) ---
  if (hasDomainSplit) {
    if (isMarketing && isPlatformOnlyRoute(path)) {
      return NextResponse.redirect(
        new URL(path + request.nextUrl.search, process.env.NEXT_PUBLIC_PLATFORM_URL),
        301
      )
    }
    if (isPlatform && isMarketingOnlyRoute(path)) {
      return NextResponse.redirect(
        new URL(path + request.nextUrl.search, process.env.NEXT_PUBLIC_MARKETING_URL),
        301
      )
    }

    // Marketing domain: no auth needed, return early
    if (isMarketing) {
      return NextResponse.next({ request })
    }
  }

  // --- Auth (platform domain or dev/single-domain) ---
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't need auth
  const isPublicRoute =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/invite') ||
    path.startsWith('/join') ||
    path.startsWith('/loyalty') ||
    path.startsWith('/refer') ||
    path.startsWith('/referral-success') ||
    path.startsWith('/auth/callback') ||
    path.startsWith('/auth/confirm') ||
    path.startsWith('/auth/recovery') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/api/') ||
    path.startsWith('/pass/') ||
    path.startsWith('/embed/')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/overview'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

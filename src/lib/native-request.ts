import type { NextRequest } from 'next/server'

const NATIVE_UA = /LoyalinkApp\/native/i

const NATIVE_ORIGINS = [
  /^capacitor:\/\/localhost$/i,
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^ionic:\/\/localhost$/i,
]

/**
 * True when the request comes from the native iOS/Android app shell.
 *
 * Primary signal is the UA suffix injected via `appendUserAgent` in
 * capacitor.config.ts. The `Origin`/`Referer` checks are belt-and-suspenders
 * for any native build that loads from a Capacitor scheme rather than the
 * live domain.
 *
 * Used to enforce App Store guideline 3.1.1: business-account registration
 * and paid subscription flows must not be reachable from the iOS app.
 */
export function isNativeRequest(req: NextRequest | Request): boolean {
  const headers = req.headers
  const ua = headers.get('user-agent') ?? ''

  if (NATIVE_UA.test(ua)) return true

  const origin = headers.get('origin') ?? ''
  if (origin && NATIVE_ORIGINS.some((re) => re.test(origin))) return true

  const referer = headers.get('referer') ?? ''
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (NATIVE_ORIGINS.some((re) => re.test(refOrigin))) return true
    } catch {
      // malformed referer — ignore
    }
  }

  return false
}

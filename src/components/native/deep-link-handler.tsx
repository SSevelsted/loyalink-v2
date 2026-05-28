'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNative } from '@/lib/platform'

/**
 * Handles the OAuth deep link on native.
 *
 * After the user authenticates in the system browser, the provider redirects
 * to `ai.loyalink.app://auth/callback?next=…&code=…`. The OS hands that URL to
 * the app (the scheme is registered in Info.plist / AndroidManifest), Capacitor
 * fires `appUrlOpen`, and we forward the code to `/auth/native-callback` — which
 * runs in *this* WebView, where the PKCE code_verifier lives, so the exchange
 * succeeds. Without this, the redirect falls through to Safari and the session
 * never reaches the app.
 */
export function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!isNative()) return

    let cleanup: (() => void) | undefined

    void (async () => {
      const { App } = await import('@capacitor/app')

      const handle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.includes('auth/callback')) return

        // Dismiss the system browser sheet that performed the OAuth.
        try {
          const { Browser } = await import('@capacitor/browser')
          await Browser.close()
        } catch {
          // Already closed (e.g. user swiped it away) — ignore.
        }

        const parsed = new URL(url)
        const code = parsed.searchParams.get('code')
        const next = parsed.searchParams.get('next') ?? '/overview'

        if (!code) {
          router.replace('/login?error=auth_callback_missing_code')
          return
        }

        router.replace(
          `/auth/native-callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
        )
      })

      cleanup = () => {
        void handle.remove()
      }
    })()

    return () => cleanup?.()
  }, [router])

  return null
}

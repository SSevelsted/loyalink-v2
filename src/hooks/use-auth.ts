'use client'

import { createClient } from '@/lib/supabase/client'
import type { StudioMember } from '@/types/database'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const NATIVE_OAUTH_CALLBACK_URL = 'ai.loyalink.app://auth/callback'

function getOAuthRedirectTo(next = '/overview') {
  return isNativeRuntime()
    ? `${NATIVE_OAUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`
    : `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
}

function isNativeRuntime() {
  return Capacitor.isNativePlatform()
}

type SupabaseBrowserClient = ReturnType<typeof createClient>

/**
 * Kicks off a provider OAuth flow.
 *
 * On native we can't redirect inside the WebView — Google rejects embedded
 * user-agents — so we ask Supabase for the provider URL, open it in the
 * system browser (skipBrowserRedirect), and let the deep-link handler bring
 * the auth code back into this WebView via ai.loyalink.app://auth/callback.
 * The code is exchanged here, where the PKCE code_verifier was stored.
 */
async function startOAuth(supabase: SupabaseBrowserClient, provider: 'google' | 'apple') {
  const { isNative } = await import('@/lib/platform')

  if (isNative()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getOAuthRedirectTo('/overview'), skipBrowserRedirect: true },
    })
    if (error || !data?.url) return { error }

    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: data.url })
    return { error: null }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: getOAuthRedirectTo('/overview') },
  })
  return { error }
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) {
      await supabase.auth.signOut({ scope: 'others' })
    }
    return { error }
  }

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email })
    return { error }
  }

  const signInWithGoogle = async () => startOAuth(supabase, 'google')

  const signInWithApple = async () => {
    const { isNative, getPlatform } = await import('@/lib/platform')

    // On iOS, use Apple's native Sign in with Apple sheet (Face ID etc.)
    // and hand the identity token directly to Supabase — no OAuth redirect,
    // no deep-link handoff, no Services ID round-trip.
    if (isNative() && getPlatform() === 'ios') {
      try {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')

        // Nonce handshake for the native flow:
        //   1. Generate a raw nonce.
        //   2. SHA-256 hash it and send the HASH to Apple — Apple echoes it
        //      verbatim into the JWT's nonce claim.
        //   3. Send the RAW nonce to Supabase; Supabase hashes it and
        //      compares against the claim. Mismatch here would mean a
        //      replayed token.
        const rawNonce = crypto.randomUUID()
        const hashedNonce = await sha256Hex(rawNonce)

        const { response } = await SignInWithApple.authorize({
          clientId: 'ai.loyalink.app',
          redirectURI: 'https://my.loyalink.ai',
          scopes: 'email name',
          state: crypto.randomUUID(),
          nonce: hashedNonce,
        })

        if (!response.identityToken) {
          return { error: new Error('Apple did not return an identity token') }
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: response.identityToken,
          nonce: rawNonce,
        })
        return { error }
      } catch (err) {
        // User cancelled the native sheet → treat as a no-op, not an error.
        const message = err instanceof Error ? err.message : String(err)
        if (/cancel/i.test(message) || /1001/.test(message)) {
          return { error: null }
        }
        return { error: err instanceof Error ? err : new Error(message) }
      }
    }

    // Web and Android fall back to Supabase's hosted OAuth flow.
    return startOAuth(supabase, 'apple')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signInWithEmail, signInWithGoogle, signInWithApple, signUp, signOut, resetPasswordForEmail, updatePassword, updateEmail }
}

export function useUserRole(studioId: string | null) {
  const [role, setRole] = useState<StudioMember['role'] | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !studioId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole(null)
      setLoading(false)
      return
    }

    supabase
      .from('studio_members')
      .select('role')
      .eq('studio_id', studioId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setRole((data?.role as StudioMember['role']) ?? null)
        setLoading(false)
      })
  }, [user, studioId, supabase])

  return { role, loading }
}

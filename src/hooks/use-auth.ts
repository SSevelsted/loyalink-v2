'use client'

import { createClient } from '@/lib/supabase/client'
import type { StudioMember } from '@/types/database'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

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

  const signInWithGoogle = async () => {
    // On native, open OAuth in the system browser (Safari/Chrome) instead of
    // in-WebView redirect, then handle the callback via deep link
    const { isNative } = await import('@/lib/platform')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative()
          ? 'ai.loyalink.app://auth/callback?next=/overview'
          : `${window.location.origin}/auth/callback?next=/overview`,
        ...(isNative() && { skipBrowserRedirect: false }),
      },
    })
    return { error }
  }

  const signInWithApple = async () => {
    // Same deep-link pattern as Google. Apple enforces the privacy rules
    // required by App Store guideline 4.8 (email relay, no ad tracking).
    const { isNative } = await import('@/lib/platform')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: isNative()
          ? 'ai.loyalink.app://auth/callback?next=/overview'
          : `${window.location.origin}/auth/callback?next=/overview`,
        ...(isNative() && { skipBrowserRedirect: false }),
      },
    })
    return { error }
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

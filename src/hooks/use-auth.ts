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

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signInWithEmail, signUp, signOut }
}

export function useUserRole(studioId: string | null) {
  const [role, setRole] = useState<StudioMember['role'] | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !studioId) {
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

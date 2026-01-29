'use client'

import { createClient } from '@/lib/supabase/client'
import type { Studio, StudioMember } from '@/types/database'
import { useEffect, useState, createContext, useContext } from 'react'
import { useAuth } from './use-auth'

type StudioContextValue = {
  studios: Studio[]
  currentStudio: Studio | null
  membership: StudioMember | null
  setCurrentStudioId: (id: string) => void
  loading: boolean
}

export const StudioContext = createContext<StudioContextValue>({
  studios: [],
  currentStudio: null,
  membership: null,
  setCurrentStudioId: () => {},
  loading: true,
})

export function useStudio() {
  return useContext(StudioContext)
}

export function useStudioLoader() {
  const { user } = useAuth()
  const [studios, setStudios] = useState<Studio[]>([])
  const [memberships, setMemberships] = useState<StudioMember[]>([])
  const [currentStudioId, setCurrentStudioId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setStudios([])
      setMemberships([])
      setCurrentStudioId(null)
      setLoading(false)
      return
    }

    async function load() {
      const { data: members } = await supabase
        .from('studio_members')
        .select('*')
        .eq('user_id', user!.id)

      if (!members?.length) {
        setLoading(false)
        return
      }

      setMemberships(members)

      const studioIds = members.map((m) => m.studio_id)
      const { data: studioList } = await supabase
        .from('studios')
        .select('*')
        .in('id', studioIds)

      setStudios(studioList ?? [])

      // Restore last selected or pick first
      const stored = localStorage.getItem('loyalink_studio_id')
      const validId = stored && studioIds.includes(stored) ? stored : studioIds[0]
      setCurrentStudioId(validId)
      setLoading(false)
    }

    load()
  }, [user, supabase])

  const handleSetStudioId = (id: string) => {
    setCurrentStudioId(id)
    localStorage.setItem('loyalink_studio_id', id)
  }

  const currentStudio = studios.find((s) => s.id === currentStudioId) ?? null
  const membership = memberships.find((m) => m.studio_id === currentStudioId) ?? null

  return {
    studios,
    currentStudio,
    membership,
    setCurrentStudioId: handleSetStudioId,
    loading,
  }
}

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
  isSuperAdmin: boolean
  ownStudioIds: Set<string>
}

export const StudioContext = createContext<StudioContextValue>({
  studios: [],
  currentStudio: null,
  membership: null,
  setCurrentStudioId: () => {},
  loading: true,
  isSuperAdmin: false,
  ownStudioIds: new Set(),
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [ownStudioIds, setOwnStudioIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStudios([])
      setMemberships([])
      setCurrentStudioId(null)
      setLoading(false)
      setIsSuperAdmin(false)
      setOwnStudioIds(new Set())
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

      const superAdmin = members.some((m) => m.role === 'super_admin')
      setIsSuperAdmin(superAdmin)

      const memberStudioIds = new Set(members.map((m) => m.studio_id))
      setOwnStudioIds(memberStudioIds)

      if (superAdmin) {
        // Super admin: fetch ALL studios
        const { data: allStudios } = await supabase
          .from('studios')
          .select('*')
          .order('name')

        const allStudioList = allStudios ?? []
        setStudios(allStudioList)

        // Build memberships: real ones + synthetic for studios without membership
        const syntheticMemberships = allStudioList
          .filter((s) => !memberStudioIds.has(s.id))
          .map((s) => ({
            id: `synthetic_${s.id}`,
            studio_id: s.id,
            user_id: user!.id,
            role: 'super_admin' as const,
            joined_at: new Date().toISOString(),
          }))

        setMemberships([...members, ...syntheticMemberships])

        // Restore last selected or pick first
        const stored = localStorage.getItem('loyalink_studio_id')
        const allIds = allStudioList.map((s) => s.id)
        const validId = stored && allIds.includes(stored) ? stored : allIds[0]
        setCurrentStudioId(validId ?? null)
      } else {
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
      }

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
    isSuperAdmin,
    ownStudioIds,
  }
}

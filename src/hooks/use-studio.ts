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
  refresh: () => void
  loading: boolean
  isSuperAdmin: boolean
  ownStudioIds: Set<string>
}

export const StudioContext = createContext<StudioContextValue>({
  studios: [],
  currentStudio: null,
  membership: null,
  setCurrentStudioId: () => {},
  refresh: () => {},
  loading: true,
  isSuperAdmin: false,
  ownStudioIds: new Set(),
})

export function useStudio() {
  return useContext(StudioContext)
}

// A `?studio=<id>` deep link (StreamInk admin opens a studio's settings or
// card designer) wins over the last selected studio, but only when the user
// can see that studio. It is stored like a switcher pick and then removed from
// the URL, so a later switch is not undone by a reload.
function pickStudioId(allowedIds: string[]): string | undefined {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('studio')
  if (requested && allowedIds.includes(requested)) {
    localStorage.setItem('loyalink_studio_id', requested)
    params.delete('studio')
    const query = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
    return requested
  }
  const stored = localStorage.getItem('loyalink_studio_id')
  return stored && allowedIds.includes(stored) ? stored : allowedIds[0]
}

export function useStudioLoader() {
  const { user } = useAuth()
  const [studios, setStudios] = useState<Studio[]>([])
  const [memberships, setMemberships] = useState<StudioMember[]>([])
  const [currentStudioId, setCurrentStudioId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [ownStudioIds, setOwnStudioIds] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
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

        // Deep link first, then last selected, then first
        const allIds = allStudioList.map((s) => s.id)
        const validId = pickStudioId(allIds)
        setCurrentStudioId(validId ?? null)
      } else {
        setMemberships(members)

        const studioIds = members.map((m) => m.studio_id)
        const { data: studioList } = await supabase
          .from('studios')
          .select('*')
          .in('id', studioIds)

        setStudios(studioList ?? [])

        // Deep link first, then last selected, then first
        const validId = pickStudioId(studioIds)
        setCurrentStudioId(validId ?? null)
      }

      setLoading(false)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase, refreshKey])

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
    refresh: () => setRefreshKey((k) => k + 1),
    loading,
    isSuperAdmin,
    ownStudioIds,
  }
}

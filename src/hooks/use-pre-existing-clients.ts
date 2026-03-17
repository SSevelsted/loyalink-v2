'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'

type PreExistingClientRecord = {
  name?: string
  email?: string
  phone?: string
}

type PreExistingClientsStatus = {
  count: number
  updatedAt: string | null
}

export function usePreExistingClients() {
  const { currentStudio } = useStudio()

  return useQuery<PreExistingClientsStatus>({
    queryKey: ['pre-existing-clients', currentStudio?.id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/pre-existing?studioId=${currentStudio!.id}`)
      if (!res.ok) throw new Error('Failed to fetch pre-existing clients')
      return res.json()
    },
    enabled: !!currentStudio,
  })
}

export function useImportPreExistingClients() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (records: PreExistingClientRecord[]) => {
      const res = await fetch('/api/customers/pre-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, records }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }
      return res.json() as Promise<{ count: number }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-existing-clients', currentStudio?.id] })
    },
  })
}

export function useClearPreExistingClients() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/customers/pre-existing?studioId=${currentStudio!.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Clear failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-existing-clients', currentStudio?.id] })
    },
  })
}

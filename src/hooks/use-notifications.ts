'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'
import type { PushCampaign, PushAutomation, AudienceFilter } from '@/types/database'

export function useCampaigns(statusFilter?: string) {
  const { currentStudio } = useStudio()

  return useQuery({
    queryKey: ['campaigns', currentStudio?.id, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ studioId: currentStudio!.id })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/notifications/campaigns?${params}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')
      return (await res.json()) as PushCampaign[]
    },
    enabled: !!currentStudio,
  })
}

export function useCreateCampaign() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      audienceType: string
      audienceFilter?: AudienceFilter
      content?: Record<string, unknown>
      scheduledAt?: string
    }) => {
      const res = await fetch('/api/notifications/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, ...params }),
      })
      if (!res.ok) throw new Error('Failed to create campaign')
      return (await res.json()) as PushCampaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', currentStudio?.id] })
    },
  })
}

export function useUpdateCampaign() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PushCampaign> & { id: string }) => {
      const res = await fetch(`/api/notifications/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update campaign')
      return (await res.json()) as PushCampaign
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', currentStudio?.id] })
    },
  })
}

export function useDeleteCampaign() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete campaign')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', currentStudio?.id] })
    },
  })
}

export function useSendCampaign() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/campaigns/${id}/send`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to send campaign')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', currentStudio?.id] })
      queryClient.invalidateQueries({ queryKey: ['push_logs'] })
    },
  })
}

export function useAudienceCount() {
  const { currentStudio } = useStudio()

  return useMutation({
    mutationFn: async (params: { audienceType: string; audienceFilter?: AudienceFilter }) => {
      const res = await fetch('/api/notifications/audience-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, ...params }),
      })
      if (!res.ok) throw new Error('Failed to fetch audience count')
      return (await res.json()) as { count: number }
    },
  })
}

export function useAutomations() {
  const { currentStudio } = useStudio()

  return useQuery({
    queryKey: ['automations', currentStudio?.id],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/automations?studioId=${currentStudio!.id}`)
      if (!res.ok) throw new Error('Failed to fetch automations')
      return (await res.json()) as PushAutomation[]
    },
    enabled: !!currentStudio,
  })
}

export function useCreateAutomation() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      triggerType: string
      triggerConfig: Record<string, unknown>
      content?: Record<string, unknown>
      audienceFilter?: AudienceFilter
    }) => {
      const res = await fetch('/api/notifications/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, ...params }),
      })
      if (!res.ok) throw new Error('Failed to create automation')
      return (await res.json()) as PushAutomation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', currentStudio?.id] })
    },
  })
}

export function useUpdateAutomation() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/notifications/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update automation')
      return (await res.json()) as PushAutomation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', currentStudio?.id] })
    },
  })
}

export function useDeleteAutomation() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/automations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete automation')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', currentStudio?.id] })
    },
  })
}

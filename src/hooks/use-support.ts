'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'
import type { SupportTicket, SupportTicketMessage, SupportTicketStatus, SupportTicketPriority } from '@/types/database'

export function useTickets(statusFilter?: string) {
  const { currentStudio } = useStudio()

  return useQuery({
    queryKey: ['support_tickets', currentStudio?.id, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ studioId: currentStudio!.id })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/support?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tickets')
      return (await res.json()) as SupportTicket[]
    },
    enabled: !!currentStudio,
  })
}

export function useCreateTicket() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      title: string
      description: string
      category?: string
      priority?: string
      attachmentUrl?: string
    }) => {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, ...params }),
      })
      if (!res.ok) throw new Error('Failed to create ticket')
      return (await res.json()) as SupportTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets', currentStudio?.id] })
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string
      status?: SupportTicketStatus
      priority?: SupportTicketPriority
      assigned_to?: string | null
      title?: string
      description?: string
      category?: string
    }) => {
      const res = await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update ticket')
      return (await res.json()) as SupportTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin_tickets'] })
    },
  })
}

export type EnrichedMessage = SupportTicketMessage & { sender_email: string }

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ['ticket_messages', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/support/${ticketId}/messages`)
      if (!res.ok) throw new Error('Failed to fetch messages')
      return (await res.json()) as EnrichedMessage[]
    },
    enabled: !!ticketId,
    refetchInterval: 30_000,
  })
}

export function useAddMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, message, isInternal }: { ticketId: string; message: string; isInternal?: boolean }) => {
      const res = await fetch(`/api/support/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isInternal }),
      })
      if (!res.ok) throw new Error('Failed to add message')
      return (await res.json()) as SupportTicketMessage
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket_messages', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin_tickets'] })
    },
  })
}

export type AdminTicket = SupportTicket & { studios: { name: string } | null }

export function useAdminTickets(filters?: { status?: string; priority?: string; studioId?: string }) {
  const { isSuperAdmin } = useStudio()

  return useQuery({
    queryKey: ['admin_tickets', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ all: 'true' })
      if (filters?.status) params.set('status', filters.status)
      if (filters?.priority) params.set('priority', filters.priority)
      if (filters?.studioId) params.set('studioId', filters.studioId)
      const res = await fetch(`/api/support?${params}`)
      if (!res.ok) throw new Error('Failed to fetch admin tickets')
      return (await res.json()) as AdminTicket[]
    },
    enabled: isSuperAdmin,
  })
}

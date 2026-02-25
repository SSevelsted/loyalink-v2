'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useStudio } from './use-studio'
import type { Studio, Transaction } from '@/types/database'
import type { AdminTicket } from './use-support'

type PlatformStats = {
  transaction_volume: number
  transaction_count: number
  customer_count: number
  studio_count: number
  active_pass_count: number
  campaign_count: number
}

export function useAdminStats() {
  const { isSuperAdmin } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_platform_stats')
      if (error) throw error
      return data as PlatformStats
    },
    enabled: isSuperAdmin,
  })
}

type StudioWithCounts = Studio & {
  studio_members: { count: number }[]
  customers: { count: number }[]
  wallet_passes: { count: number }[]
}

export function useAdminStudios(search?: string) {
  const { isSuperAdmin } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['admin_studios', search],
    queryFn: async () => {
      let query = supabase
        .from('studios')
        .select('*, studio_members(count), customers(count), wallet_passes(count)')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as StudioWithCounts[]
    },
    enabled: isSuperAdmin,
  })
}

type AdminUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  studios: Array<{
    studio_id: string
    studio_name: string
    role: string
  }>
}

export function useAdminUsers() {
  const { isSuperAdmin } = useStudio()

  return useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      return (await res.json()) as AdminUser[]
    },
    enabled: isSuperAdmin,
  })
}

export function useAdminActivity(range: '24h' | '7d' | '30d' = '7d') {
  const { isSuperAdmin } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['admin_activity', range],
    queryFn: async () => {
      const now = new Date()
      const hoursMap = { '24h': 24, '7d': 168, '30d': 720 }
      const since = new Date(now.getTime() - hoursMap[range] * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(name), studios(name)')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as (Transaction & { customers: { name: string } | null; studios: { name: string } | null })[]
    },
    enabled: isSuperAdmin,
  })
}

type TicketStats = {
  open: number
  in_progress: number
  urgent_high: number
  waiting_on_customer: number
}

export function useAdminTicketStats() {
  const { isSuperAdmin } = useStudio()

  return useQuery({
    queryKey: ['admin_ticket_stats'],
    queryFn: async () => {
      const res = await fetch('/api/support?all=true')
      if (!res.ok) throw new Error('Failed to fetch tickets')
      const tickets = (await res.json()) as AdminTicket[]

      const stats: TicketStats = {
        open: 0,
        in_progress: 0,
        urgent_high: 0,
        waiting_on_customer: 0,
      }

      for (const t of tickets) {
        if (t.status === 'open') stats.open++
        if (t.status === 'in_progress') stats.in_progress++
        if (t.status === 'waiting_on_customer') stats.waiting_on_customer++
        if (t.priority === 'urgent' || t.priority === 'high') {
          if (t.status !== 'resolved' && t.status !== 'closed') stats.urgent_high++
        }
      }

      return stats
    },
    enabled: isSuperAdmin,
  })
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'
import { createClient } from '@/lib/supabase/client'
import type { RewardsConfig, Referral, TierConfig } from '@/types/database'
import { DEFAULT_REWARDS_CONFIG } from '@/types/database'

export function useRewardsConfig() {
  const { currentStudio } = useStudio()

  return useQuery({
    queryKey: ['rewards_config', currentStudio?.id],
    queryFn: async () => {
      const res = await fetch(`/api/rewards/config?studioId=${currentStudio!.id}`)
      if (!res.ok) throw new Error('Failed to fetch rewards config')
      return (await res.json()) as RewardsConfig
    },
    enabled: !!currentStudio,
    placeholderData: DEFAULT_REWARDS_CONFIG,
    staleTime: 5 * 60 * 1000, // rewards config rarely changes — cache for 5 min
  })
}

export function useUpdateRewardsConfig() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: RewardsConfig) => {
      const res = await fetch('/api/rewards/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, config }),
      })
      if (!res.ok) throw new Error('Failed to save rewards config')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards_config', currentStudio?.id] })
    },
  })
}

export function useMigrateTiers() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      newConfig: RewardsConfig
      mappings: Record<string, string>
      applyRateChanges: boolean
      applyToExisting: boolean
    }) => {
      const res = await fetch('/api/rewards/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, ...params }),
      })
      if (!res.ok) throw new Error('Migration failed')
      return res.json() as Promise<{ success: boolean; migratedMembers: number; migratedPromotions: number }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards_config', currentStudio?.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['tier_member_counts'] })
    },
  })
}

export function useMigrateReferrals() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      newConfig: RewardsConfig
      applyFriendRate: boolean
      applyCommissionDuration: boolean
    }) => {
      const res = await fetch('/api/rewards/migration/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, ...params }),
      })
      if (!res.ok) throw new Error('Referral migration failed')
      return res.json() as Promise<{ success: boolean; updatedFriends: number; updatedReferrals: number }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards_config', currentStudio?.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer_referrals'] })
    },
  })
}

export function useReferralMigrationPreview() {
  const { currentStudio } = useStudio()

  return useQuery({
    queryKey: ['referral_migration_preview', currentStudio?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/rewards/migration/referrals/preview?studioId=${currentStudio!.id}`
      )
      if (!res.ok) throw new Error('Failed to fetch referral preview')
      return res.json() as Promise<{ referredFriends: number; activeReferrals: number }>
    },
    enabled: false, // Only fetch on demand
  })
}

export function useProcessTransaction() {
  return useMutation({
    mutationFn: async (params: { customerId: string; studioId: string; transactionId: string; amount: number; cashAmount?: number; isDeposit?: boolean }) => {
      const res = await fetch('/api/rewards/process-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('Failed to process transaction')
      return res.json()
    },
  })
}

export function useCustomerReferrals(customerId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['customer_referrals', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*, referred_customer:referred_customer_id(name)')
        .eq('referrer_customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Referral & { referred_customer: { name: string } })[]
    },
    enabled: !!customerId,
  })
}

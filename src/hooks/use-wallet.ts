'use client'

import { createClient } from '@/lib/supabase/client'
import type { PassTemplate, WalletPass, WalletPushLog } from '@/types/database'
import { DEFAULT_TIER_THEMES, DEFAULT_CARD_FIELDS, DEFAULT_STATIC_TEXTS } from '@/types/database'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'
import { PASS_SERVICE_URL } from '@/lib/constants'

export function usePassTemplates() {
  const { currentStudio } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['pass_templates', currentStudio?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pass_templates')
        .select('*')
        .eq('studio_id', currentStudio!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PassTemplate[]
    },
    enabled: !!currentStudio,
  })
}

export function useUpdatePassTemplate() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PassTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('pass_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pass_templates'] })
    },
  })
}

export function useCustomerPasses(customerId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['wallet_passes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_passes')
        .select('*')
        .eq('customer_id', customerId)
      if (error) throw error
      return data as WalletPass[]
    },
    enabled: !!customerId,
  })
}

export function useGeneratePass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { customerId: string; studioId: string; templateId: string }) => {
      const res = await fetch(`${PASS_SERVICE_URL}/api/passes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('Failed to generate pass')
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['wallet_passes', vars.customerId] })
    },
  })
}

export function useSendPush() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { targetType: string; customerId?: string }) => {
      const res = await fetch(`${PASS_SERVICE_URL}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, studioId: currentStudio!.id }),
      })
      if (!res.ok) throw new Error('Failed to send push')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push_logs'] })
    },
  })
}

export function useEnsureDefaultTemplate() {
  const { currentStudio } = useStudio()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!currentStudio) throw new Error('No studio')
      const { data, error } = await supabase
        .from('pass_templates')
        .insert({
          studio_id: currentStudio.id,
          name: `${currentStudio.name} Pass`,
          is_active: true,
          tier_themes: DEFAULT_TIER_THEMES as unknown as Record<string, unknown>,
          card_fields: DEFAULT_CARD_FIELDS as unknown[],
          static_texts: DEFAULT_STATIC_TEXTS as Record<string, unknown>,
          barcode_format: 'PKBarcodeFormatQR',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pass_templates'] })
    },
  })
}

export function usePushLogs() {
  const { currentStudio } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['push_logs', currentStudio?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_push_logs')
        .select('*')
        .eq('studio_id', currentStudio!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as WalletPushLog[]
    },
    enabled: !!currentStudio,
  })
}

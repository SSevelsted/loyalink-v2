'use client'

import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'

export function useCustomers(search?: string) {
  const { currentStudio } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['customers', currentStudio?.id, search],
    queryFn: async () => {
      if (!currentStudio) return []
      let query = supabase
        .from('customers')
        .select('*')
        .eq('studio_id', currentStudio.id)
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Customer[]
    },
    enabled: !!currentStudio,
  })
}

export function useCustomer(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const { currentStudio } = useStudio()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, studio_id: currentStudio!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', data.id] })
    },
  })
}

'use client'

import { createClient } from '@/lib/supabase/client'
import type { StudioLandingPage } from '@/types/database'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'

export type LandingPageSettings = {
  brandColor: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  buttonText: string
  showPhone: boolean
  showEmail: boolean
}

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  brandColor: '#7C3AED',
  backgroundColor: '#0A0A0A',
  textColor: '#FFFFFF',
  logoUrl: null,
  buttonText: 'Join & Get Your Pass',
  showPhone: true,
  showEmail: true,
}

export function useLandingPage() {
  const { currentStudio } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['landing_page', currentStudio?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_landing_pages')
        .select('*')
        .eq('studio_id', currentStudio!.id)
        .limit(1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return (data as StudioLandingPage) ?? null
    },
    enabled: !!currentStudio,
  })
}

export function useUpdateLandingPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudioLandingPage> & { id: string }) => {
      const { data, error } = await supabase
        .from('studio_landing_pages')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing_page'] })
    },
  })
}

export function useEnsureLandingPage() {
  const { currentStudio } = useStudio()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!currentStudio) throw new Error('No studio')

      // Check if one exists
      const { data: existing } = await supabase
        .from('studio_landing_pages')
        .select('id')
        .eq('studio_id', currentStudio.id)
        .limit(1)
        .single()

      if (existing) return existing

      const slug = currentStudio.slug || currentStudio.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

      const { data, error } = await supabase
        .from('studio_landing_pages')
        .insert({
          studio_id: currentStudio.id,
          slug,
          headline: `Welcome to ${currentStudio.name}`,
          description: 'Sign up and get your digital loyalty card instantly.',
          settings: DEFAULT_LANDING_SETTINGS as Record<string, unknown>,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing_page'] })
    },
  })
}

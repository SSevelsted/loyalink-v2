'use client'

import { createClient } from '@/lib/supabase/client'
import type { StudioLandingPage } from '@/types/database'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './use-studio'
import { getDefaultLandingPageCopy } from '@/lib/landing-page-defaults'

export type CustomField = {
  id: string
  label: string
  type: 'text' | 'select'
  required: boolean
  options?: string[] // for select type
}

export type Benefit = {
  id: string
  text: string
  icon: string // lucide icon key
}

export type LandingPageSettings = {
  brandColor: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  buttonText: string
  showPhone: boolean
  showEmail: boolean
  customFields?: CustomField[]
  benefits?: Benefit[]
  showTierProgression?: boolean
  successHeading?: string
  successMessage?: string
  termsUrl?: string
  // Market: currency + language for this landing page. When unset, the studio's
  // currency/language is used. Stamped onto each customer who joins via this page.
  currency?: string
  language?: string
}

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  brandColor: '#7C3AED',
  backgroundColor: '#0A0A0A',
  textColor: '#FFFFFF',
  logoUrl: null,
  buttonText: 'Join & Get Your Pass',
  showPhone: true,
  showEmail: true,
  successHeading: "You're in!",
  successMessage: 'Welcome, {name}. Your loyalty card is ready.',
  termsUrl: '',
}

export function resolveLandingPageSettings(
  settings: LandingPageSettings | null | undefined,
  options: { defaultLogoUrl?: string | null; termsUrl?: string } = {}
): LandingPageSettings {
  const merged = { ...DEFAULT_LANDING_SETTINGS, ...(settings ?? {}) }
  if (!merged.logoUrl && options.defaultLogoUrl) merged.logoUrl = options.defaultLogoUrl
  if (options.termsUrl) merged.termsUrl = merged.termsUrl || options.termsUrl
  return merged
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
      queryClient.invalidateQueries({ queryKey: ['landing_pages'] })
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
      const studioSettings = (currentStudio.settings ?? {}) as Record<string, unknown>
      const language = (studioSettings.language as string | undefined) ?? 'en'
      const currency = (studioSettings.currency as string | undefined) ?? undefined
      const defaults = getDefaultLandingPageCopy(currentStudio.name, language)

      const { data, error } = await supabase
        .from('studio_landing_pages')
        .insert({
          studio_id: currentStudio.id,
          slug,
          headline: defaults.headline,
          description: defaults.description,
          settings: {
            ...DEFAULT_LANDING_SETTINGS,
            buttonText: defaults.buttonText,
            successHeading: defaults.successHeading,
            successMessage: defaults.successMessage,
            ...(currency ? { currency } : {}),
            language,
          } as Record<string, unknown>,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing_page'] })
      queryClient.invalidateQueries({ queryKey: ['landing_pages'] })
    },
  })
}

/** All landing pages (markets) for the current studio, oldest first. */
export function useLandingPages() {
  const { currentStudio } = useStudio()
  const supabase = createClient()

  return useQuery({
    queryKey: ['landing_pages', currentStudio?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_landing_pages')
        .select('*')
        .eq('studio_id', currentStudio!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as StudioLandingPage[]) ?? []
    },
    enabled: !!currentStudio,
  })
}

/**
 * Create an additional market (landing page). Slug is derived from the studio
 * slug with a numeric suffix ({slug}-2, {slug}-3, ...) so it stays globally
 * unique. Currency/language seed the new page's market.
 */
export function useCreateLandingPage() {
  const { currentStudio } = useStudio()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (init?: { currency?: string; language?: string }) => {
      if (!currentStudio) throw new Error('No studio')

      const baseSlug = currentStudio.slug || currentStudio.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

      // Find the next free {baseSlug}-N. baseSlug is the studio's globally unique
      // slug, so a per-studio uniqueness check is sufficient.
      const { data: existing } = await supabase
        .from('studio_landing_pages')
        .select('slug')
        .eq('studio_id', currentStudio.id)
      const taken = new Set((existing ?? []).map((p) => p.slug as string))
      let n = 2
      while (taken.has(`${baseSlug}-${n}`)) n++
      const slug = `${baseSlug}-${n}`

      const studioSettings = (currentStudio.settings ?? {}) as Record<string, unknown>
      const language = init?.language ?? (studioSettings.language as string | undefined) ?? 'en'
      const defaults = getDefaultLandingPageCopy(currentStudio.name, language)
      const settings = {
        ...DEFAULT_LANDING_SETTINGS,
        buttonText: defaults.buttonText,
        successHeading: defaults.successHeading,
        successMessage: defaults.successMessage,
      } as Record<string, unknown>
      if (init?.currency) settings.currency = init.currency
      if (language) settings.language = language

      const { data, error } = await supabase
        .from('studio_landing_pages')
        .insert({
          studio_id: currentStudio.id,
          slug,
          headline: defaults.headline,
          description: defaults.description,
          settings,
        })
        .select()
        .single()
      if (error) throw error
      return data as StudioLandingPage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing_pages'] })
      queryClient.invalidateQueries({ queryKey: ['landing_page'] })
    },
  })
}

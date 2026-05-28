'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStudio } from '@/hooks/use-studio'
import { useLandingPage, useUpdateLandingPage, useEnsureLandingPage, DEFAULT_LANDING_SETTINGS } from '@/hooks/use-landing-page'
import type { LandingPageSettings } from '@/hooks/use-landing-page'
import { usePassTemplates, useEnsureDefaultTemplate, useUpdatePassTemplate } from '@/hooks/use-wallet'
import { useImageUpload } from '@/hooks/use-image-upload'
import { createClient } from '@/lib/supabase/client'
import { CardPreview } from '@/components/wallet/card-preview'
import { TierList } from '@/components/wallet/tier-list'
import { TierEditor } from '@/components/wallet/tier-editor'
import { ImageUpload, type ImageUploadHandle } from '@/components/wallet/image-upload'
import { LandingPagePreview } from '@/components/landing/landing-page-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmbedCode } from '@/components/landing/embed-code'
import { SignupQR } from '@/components/landing/signup-qr'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ArrowRight, Check, ChevronRight, ChevronLeft, Rocket, Palette, CreditCard, Eye, Copy, PartyPopper, Link as LinkIcon, Gift, Plus, Trash2, RotateCcw, Building2, Paintbrush, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const LANDING_PRESETS = [
  { name: 'Dark', bg: '#0A0A0A', text: '#FFFFFF', brand: '#7C3AED' },
  { name: 'Light', bg: '#FFFFFF', text: '#111827', brand: '#7C3AED' },
  { name: 'Ocean', bg: '#0C1A2E', text: '#E2EBF5', brand: '#3B82F6' },
  { name: 'Forest', bg: '#0A1A0F', text: '#E8F5EC', brand: '#22C55E' },
  { name: 'Rose', bg: '#1A0A0E', text: '#FFF1F3', brand: '#F43F5E' },
  { name: 'Amber', bg: '#1A1000', text: '#FFFBEB', brand: '#F59E0B' },
]
import { toast } from 'sonner'
import { MARKETING_URL } from '@/lib/constants'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/locale-options'
import type { CustomField, Benefit } from '@/hooks/use-landing-page'
import { generateDefaultBenefits, BENEFIT_ICON_MAP, BENEFIT_ICON_OPTIONS } from '@/components/landing/value-stack'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TierTheme, CardField, RewardsConfig } from '@/types/database'
import { DEFAULT_TIER_THEMES, DEFAULT_CARD_FIELDS, DEFAULT_REWARDS_CONFIG, migrateRewardsConfig, getActiveTierSlugs } from '@/types/database'
import { getTriggerLabel } from '@/components/rewards/rewards-config-form'
import { ProgramOverview } from '@/components/rewards/program-overview'
import { ReferralProgram } from '@/components/rewards/referral-program'
import { TemplatePicker } from '@/components/rewards/template-picker'
import { RewardsProgramPreview } from '@/components/rewards/program-preview'
import { REWARD_TEMPLATES, DEFAULT_TEMPLATE_ID, type TemplateId } from '@/lib/rewards-templates'
import { DownloadAppCard } from '@/components/layout/download-app-card'

const COUNTRY_OPTIONS = [
  { value: 'DK', label: 'Denmark' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'FI', label: 'Finland' },
  { value: 'DE', label: 'Germany' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AT', label: 'Austria' },
  { value: 'PL', label: 'Poland' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
]

const STEPS = [
  { label: 'Studio Info', icon: Building2 },
  { label: 'Rewards Program', icon: Gift },
  { label: 'Card Designer', icon: CreditCard },
  { label: 'Landing Page', icon: Palette },
  { label: 'Review & Go Live', icon: Rocket },
]

export default function SetupPage() {
  const router = useRouter()
  const { currentStudio, refresh: refreshStudio } = useStudio()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [showLiveDialog, setShowLiveDialog] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // --- Studio Info state ---
  const [studioName, setStudioName] = useState(currentStudio?.name ?? '')
  const [studioEmail, setStudioEmail] = useState('')
  const [studioPhone, setStudioPhone] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressPostalCode, setAddressPostalCode] = useState('')
  const [addressCountry, setAddressCountry] = useState('DK')
  const [selectedCurrency, setSelectedCurrency] = useState('dkk')
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  // --- Landing Page state ---
  const { data: landingPage, isLoading: lpLoading } = useLandingPage()
  const updateLandingPage = useUpdateLandingPage()
  const ensureLandingPage = useEnsureLandingPage()
  const { upload, uploading } = useImageUpload()

  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_LANDING_SETTINGS)

  // --- Card Designer state ---
  const { data: templates, isLoading: tplLoading } = usePassTemplates()
  const updateTemplate = useUpdatePassTemplate()
  const ensureTemplate = useEnsureDefaultTemplate()

  // --- Rewards config state ---
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE_ID)
  const [baseTemplateId, setBaseTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE_ID)
  const classicConfig = REWARD_TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE_ID)!.config
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfig>(classicConfig)
  // Default to template-first preview; flips on when the user clicks Customize
  // or when a previously-saved custom config is restored from DB.
  const [customizingRewards, setCustomizingRewards] = useState(false)

  const [selectedTier, setSelectedTier] = useState(DEFAULT_REWARDS_CONFIG.tiers[0].slug)
  const [tierThemes, setTierThemes] = useState<Record<string, TierTheme>>(DEFAULT_TIER_THEMES)
  const [cardFields, setCardFields] = useState<CardField[]>(DEFAULT_CARD_FIELDS)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)

  const logoUploadRef = useRef<ImageUploadHandle>(null)
  const stripUploadRef = useRef<ImageUploadHandle>(null)
  const iconUploadRef = useRef<ImageUploadHandle>(null)

  // Mirror of `currentStudio.settings` that we keep up-to-date with every
  // write we make from this page. `useStudio` does not refetch after writes,
  // so spreading `currentStudio.settings` directly causes back-to-back saves
  // to overwrite each other (e.g. saveStepProgress wiping saveStudioInfo).
  // Initialized when the studio first loads; merged-into on every save below.
  const settingsRef = useRef<Record<string, unknown>>({})

  const template = templates?.[0]

  // Ensure landing page exists
  useEffect(() => {
    if (!lpLoading && !landingPage && currentStudio) {
      ensureLandingPage.mutate()
    }
  }, [lpLoading, landingPage, currentStudio])

  // Load landing page data
  useEffect(() => {
    if (landingPage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeadline(landingPage.headline ?? '')
      setDescription(landingPage.description ?? '')
      const s = landingPage.settings as LandingPageSettings | null
      const generatedTermsUrl = `${MARKETING_URL}/join/${landingPage.slug}/terms`
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (s) setSettings({ ...DEFAULT_LANDING_SETTINGS, ...s, termsUrl: s.termsUrl || generatedTermsUrl })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      else setSettings({ ...DEFAULT_LANDING_SETTINGS, termsUrl: generatedTermsUrl })
    }
  }, [landingPage?.id])

  // Ensure template exists
  useEffect(() => {
    if (!tplLoading && !templates?.length && currentStudio) {
      ensureTemplate.mutate()
    }
  }, [tplLoading, templates?.length, currentStudio])

  // Load template data
  useEffect(() => {
    if (template) {
      const themes = template.tier_themes as Record<string, TierTheme> | null
      if (themes && Object.keys(themes).length > 0) {
        const merged: Record<string, TierTheme> = { ...DEFAULT_TIER_THEMES }
        for (const [slug, theme] of Object.entries(themes)) {
          merged[slug] = { ...(DEFAULT_TIER_THEMES[slug] ?? merged[slug] ?? {}), ...theme } as TierTheme
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTierThemes(merged)
      }
      const fields = template.card_fields as CardField[] | null
      if (fields && fields.length > 0) setCardFields(fields)
      setLogoUrl(template.logo_url)
      setIconUrl(template.icon_url)
      const loadedThemes = template.tier_themes as Record<string, TierTheme> | undefined
      const firstTheme = loadedThemes ? loadedThemes[Object.keys(loadedThemes)[0]] : undefined
      setStripUrl(firstTheme?.stripImage ?? null)
    }
  }, [template?.id])

  // Restore step and rewards config from studio settings
  useEffect(() => {
    const s = currentStudio?.settings as Record<string, unknown> | undefined
    // Seed our settings cache once per studio; subsequent saves merge into this ref
    // so they don't clobber each other with a stale snapshot.
    settingsRef.current = { ...(s ?? {}) }
    if (typeof s?.onboarding_step === 'number') {
      const restored = s.onboarding_step as number
      // Clamp to max step (4) in case coming from a previous version
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(Math.min(restored, 4))
    }
    if (s?.rewards_config) {
      setRewardsConfig(migrateRewardsConfig(s.rewards_config))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTemplateId('custom')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomizingRewards(true)
    }
    // Load studio info state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentStudio?.name) setStudioName(currentStudio.name)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.email) setStudioEmail(s.email as string)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.phone) setStudioPhone(s.phone as string)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.address_street) setAddressStreet(s.address_street as string)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.address_city) setAddressCity(s.address_city as string)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.address_postal_code) setAddressPostalCode(s.address_postal_code as string)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.address_country) setAddressCountry(s.address_country as string)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.currency) setSelectedCurrency(s.currency as string)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s?.language) setSelectedLanguage(s.language as string)
  }, [currentStudio?.id])

  // Auto-generate tier themes for new tier slugs and sync sortOrder to match rewards config order
  useEffect(() => {
    const newThemes = { ...tierThemes }
    let changed = false
    for (let i = 0; i < rewardsConfig.tiers.length; i++) {
      const tier = rewardsConfig.tiers[i]
      if (!newThemes[tier.slug]) {
        newThemes[tier.slug] = DEFAULT_TIER_THEMES[tier.slug] ?? {
          name: tier.name,
          backgroundColor: '#333333',
          foregroundColor: '#FFFFFF',
          labelColor: '#AAAAAA',
          stripImage: null,
          logoOverride: null,
          sortOrder: i,
        }
        changed = true
      } else if (newThemes[tier.slug].sortOrder !== i) {
        newThemes[tier.slug] = { ...newThemes[tier.slug], sortOrder: i }
        changed = true
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (changed) setTierThemes(newThemes)
  }, [rewardsConfig.tiers])

  const updateSetting = (key: keyof LandingPageSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogoUpload = async (file: File) => {
    const url = await upload(file, 'landing_logo.png')
    if (url) updateSetting('logoUrl', url)
  }

  const handleTierChange = useCallback(
    (updates: Partial<TierTheme>) => {
      setTierThemes((prev) => {
        const existing = prev[selectedTier] ?? DEFAULT_TIER_THEMES[selectedTier] ?? {
          name: selectedTier,
          backgroundColor: '#333333',
          foregroundColor: '#FFFFFF',
          labelColor: '#AAAAAA',
          stripImage: null,
          logoOverride: null,
          sortOrder: Object.keys(prev).length,
        }
        return { ...prev, [selectedTier]: { ...existing, ...updates } }
      })
    },
    [selectedTier]
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleAddTier = useCallback(() => {
    const slug = `custom_${Date.now()}`
    setTierThemes((prev) => ({
      ...prev,
      [slug]: {
        name: 'New Tier',
        backgroundColor: '#333333',
        foregroundColor: '#FFFFFF',
        labelColor: '#AAAAAA',
        stripImage: null,
        logoOverride: null,
        sortOrder: Object.keys(prev).length,
      },
    }))
    setSelectedTier(slug)
  }, [])

  const handleDeleteTier = useCallback(() => {
    setTierThemes((prev) => {
      const next = { ...prev }
      delete next[selectedTier]
      return next
    })
    setSelectedTier(DEFAULT_REWARDS_CONFIG.tiers[0].slug)
  }, [selectedTier])

  const handleTemplateSelect = useCallback((id: TemplateId) => {
    setSelectedTemplateId(id)
    if (id !== 'custom') setBaseTemplateId(id)
    const template = REWARD_TEMPLATES.find(t => t.id === id)
    if (template) setRewardsConfig(template.config)
    // "Custom" template has no preview — jump straight into the editor.
    setCustomizingRewards(id === 'custom')
  }, [])

  const handleRewardsConfigChange = useCallback((config: RewardsConfig) => {
    setRewardsConfig(config)
    setSelectedTemplateId('custom')
  }, [])

  const handleCardLogoUpload = async (file: File) => {
    const url = await upload(file, 'logo.png')
    if (url) setLogoUrl(url)
  }

  const handleStripUpload = async (file: File) => {
    const url = await upload(file, 'strip.png')
    if (url) setStripUrl(url)
  }

  const handleIconUpload = async (file: File) => {
    const url = await upload(file, 'icon.png')
    if (url) setIconUrl(url)
  }

  const handleTierLogoUpload = async (file: File) => {
    const url = await upload(file, `logo_${selectedTier}.png`)
    if (url) handleTierChange({ logoOverride: url })
  }

  // Merge a settings patch into our local cache and write it as one atomic
  // update. Always reads from `settingsRef` (which reflects every prior write
  // we made on this page), never from the possibly-stale `currentStudio`.
  const writeStudio = async (
    patch: Record<string, unknown>,
    extra?: { name?: string },
  ) => {
    if (!currentStudio) return
    settingsRef.current = { ...settingsRef.current, ...patch }
    const update: Record<string, unknown> = { settings: settingsRef.current }
    if (extra?.name !== undefined) update.name = extra.name
    const { error } = await supabase
      .from('studios')
      .update(update)
      .eq('id', currentStudio.id)
    if (error) throw error
  }

  const saveStudioInfo = async () => {
    await writeStudio(
      {
        email: studioEmail,
        phone: studioPhone,
        address_street: addressStreet,
        address_city: addressCity,
        address_postal_code: addressPostalCode,
        address_country: addressCountry,
        currency: selectedCurrency,
        language: selectedLanguage,
      },
      { name: studioName },
    )
  }

  const saveLandingPage = async () => {
    if (!landingPage) return
    await updateLandingPage.mutateAsync({
      id: landingPage.id,
      headline,
      description,
      settings: settings as unknown as Record<string, unknown>,
      hero_image_url: settings.logoUrl,
    })
  }

  const saveCardDesigner = async () => {
    if (!template) return
    await updateTemplate.mutateAsync({
      id: template.id,
      tier_themes: tierThemes as unknown as Record<string, unknown>,
      card_fields: cardFields as unknown[],
      logo_url: logoUrl,
      icon_url: iconUrl,
    })
  }

  const saveRewardsConfig = async () => {
    await writeStudio({ rewards_config: rewardsConfig })
  }

  const saveStepProgress = async (nextStep: number) => {
    await writeStudio({ onboarding_step: nextStep, onboarding_version: 2 })
  }

  const handleNext = async () => {
    try {
      if (step === 0) await saveStudioInfo()
      if (step === 1) await saveRewardsConfig()
      if (step === 2) await saveCardDesigner()
      if (step === 3) await saveLandingPage()
      const nextStep = step + 1
      await saveStepProgress(nextStep)
      setStep(nextStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('Failed to save. Please try again.')
    }
  }

  const handleBack = async () => {
    // Persist the current step before leaving it so a typo-fix loop
    // (Back → edit earlier step → Next) doesn't lose what they typed here.
    try {
      if (step === 0) await saveStudioInfo()
      if (step === 1) await saveRewardsConfig()
      if (step === 2) await saveCardDesigner()
      if (step === 3) await saveLandingPage()
      const prevStep = Math.max(0, step - 1)
      await saveStepProgress(prevStep)
      setStep(prevStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('Failed to save. Please try again.')
    }
  }

  const handleGoLive = async () => {
    try {
      await saveStudioInfo()
      await saveLandingPage()
      await saveCardDesigner()
      await saveRewardsConfig()
      await writeStudio({
        rewards_config: rewardsConfig,
        onboarding_completed: true,
        onboarding_step: 4,
        onboarding_version: 2,
      })
      refreshStudio()
      setShowLiveDialog(true)
    } catch {
      toast.error('Failed to go live. Please try again.')
    }
  }

  // Drive currency & language from the in-memory selection so they propagate to
  // steps 1-4 the moment the user picks them in step 0 — `currentStudio.settings`
  // only updates after a `useStudio()` refresh, which would lag a step behind.
  const currency = selectedCurrency
  const language = selectedLanguage

  // Filter tiers to only show active ones (from rewards config) + custom tiers.
  // Always include a theme entry for every active slug, generating defaults for missing ones.
  // Use rewards config index as sortOrder to ensure consistent ordering.
  const activeSlugs = getActiveTierSlugs(rewardsConfig)
  const visibleTierThemes: Record<string, TierTheme> = {}
  for (const slug of activeSlugs) {
    const tierIndex = rewardsConfig.tiers.findIndex(t => t.slug === slug)
    const sortOrder = tierIndex >= 0 ? tierIndex : Object.keys(visibleTierThemes).length
    const base = tierThemes[slug] ?? DEFAULT_TIER_THEMES[slug] ?? {
      name: rewardsConfig.tiers.find(t => t.slug === slug)?.name ?? slug,
      backgroundColor: '#333333',
      foregroundColor: '#FFFFFF',
      labelColor: '#AAAAAA',
      stripImage: null,
      logoOverride: null,
      sortOrder,
    }
    visibleTierThemes[slug] = { ...base, sortOrder }
  }
  // Also include custom tiers that exist in tierThemes
  for (const [slug, theme] of Object.entries(tierThemes)) {
    if (slug.startsWith('custom_') && !visibleTierThemes[slug]) {
      visibleTierThemes[slug] = theme
    }
  }

  // Guard: fall back to first tier if selected tier is no longer visible
  useEffect(() => {
    const isVisible = activeSlugs.includes(selectedTier) || selectedTier.startsWith('custom_')
    if (!isVisible) {
      const fallback = activeSlugs[0] ?? DEFAULT_REWARDS_CONFIG.tiers[0].slug
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (fallback !== selectedTier) setSelectedTier(fallback)
    }
  }, [rewardsConfig, selectedTier])

  if (lpLoading || tplLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-96 animate-shimmer rounded-xl" />
      </div>
    )
  }

  // Ensure currentTier always resolves — handles timing gaps between effects
  const currentTier = visibleTierThemes[selectedTier]
    ?? Object.values(visibleTierThemes)[0]
    ?? DEFAULT_TIER_THEMES[DEFAULT_REWARDS_CONFIG.tiers[0].slug]

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Setup Your Studio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete these steps to get your loyalty program live
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${done ? 'bg-primary' : 'bg-border'}`} />}
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  done
                    ? 'bg-primary/10 text-primary'
                    : active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0 space-y-6">
              {/* Content Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Content</h2>
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Welcome to Studio Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Sign up and get your digital loyalty card instantly."
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <ImageUpload
                    label="Logo"
                    hint="PNG, square"
                    aspect={1}
                    targetWidth={256}
                    targetHeight={256}
                    currentUrl={settings.logoUrl}
                    onUpload={handleLogoUpload}
                    onRemove={() => updateSetting('logoUrl', null)}
                    uploading={uploading}
                    removeBgType="graphic"
                  />
                </div>
              </div>

              <Separator />

              {/* Branding Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Branding</h2>
                {/* Quick presets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Paintbrush className="h-3 w-3" />
                      Color Theme
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Click a theme to apply</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {LANDING_PRESETS.map((preset) => {
                      const isActive = preset.bg === settings.backgroundColor && preset.text === settings.textColor && preset.brand === settings.brandColor
                      return (
                        <button
                          key={preset.name}
                          onClick={() => {
                            updateSetting('backgroundColor', preset.bg)
                            updateSetting('textColor', preset.text)
                            updateSetting('brandColor', preset.brand)
                          }}
                          className={cn(
                            'group flex flex-col items-center gap-1.5 transition-all',
                            isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                          )}
                        >
                          <div
                            className={cn(
                              'w-14 h-10 rounded-lg overflow-hidden border-2 transition-all',
                              isActive ? 'border-primary shadow-[0_0_0_2px] shadow-primary/30' : 'border-border/40 group-hover:border-primary/40'
                            )}
                          >
                            <div className="w-full h-[70%]" style={{ backgroundColor: preset.bg }} />
                            <div className="w-full h-[30%]" style={{ backgroundColor: preset.brand }} />
                          </div>
                          <span className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                            {preset.name}
                          </span>
                        </button>
                      )
                    })}
                    {/* Custom tile — always visible, active when no preset matches */}
                    {(() => {
                      const isCustomActive = !LANDING_PRESETS.some(p => p.bg === settings.backgroundColor && p.text === settings.textColor && p.brand === settings.brandColor)
                      return (
                        <div className={cn('flex flex-col items-center gap-1.5 transition-all', isCustomActive ? 'opacity-100' : 'opacity-70 hover:opacity-100')}>
                          <div
                            className={cn(
                              'w-14 h-10 rounded-lg border-2 border-dashed transition-all relative flex items-center justify-center overflow-hidden',
                              isCustomActive ? 'border-primary shadow-[0_0_0_2px] shadow-primary/30' : 'border-border hover:border-primary/50 bg-secondary/50'
                            )}
                          >
                            {isCustomActive ? (
                              <>
                                <div className="absolute inset-x-0 top-0 h-[70%]" style={{ backgroundColor: settings.backgroundColor }} />
                                <div className="absolute inset-x-0 bottom-0 h-[30%]" style={{ backgroundColor: settings.brandColor }} />
                              </>
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className={cn('text-[10px] font-medium transition-colors', isCustomActive ? 'text-foreground' : 'text-muted-foreground')}>
                            Custom
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Brand Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.brandColor}
                        onChange={(e) => updateSetting('brandColor', e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.brandColor}
                        onChange={(e) => updateSetting('brandColor', e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Background</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.backgroundColor}
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.backgroundColor}
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Text Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.textColor}
                        onChange={(e) => updateSetting('textColor', e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.textColor}
                        onChange={(e) => updateSetting('textColor', e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input
                    value={settings.buttonText}
                    onChange={(e) => updateSetting('buttonText', e.target.value)}
                    placeholder="Join & Get Your Pass"
                  />
                </div>
              </div>

              <Separator />

              {/* Form Fields Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Form Fields</h2>
                <p className="text-xs text-muted-foreground -mt-2">Full name is always collected. Choose which additional fields to show.</p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      size="sm"
                      checked={settings.showEmail}
                      onCheckedChange={(checked) => updateSetting('showEmail', checked)}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      size="sm"
                      checked={settings.showPhone}
                      onCheckedChange={(checked) => updateSetting('showPhone', checked)}
                    />
                    Phone
                  </label>
                </div>

              {/* Custom Fields */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Custom Fields</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      const newField: CustomField = {
                        id: `field_${Date.now()}`,
                        label: '',
                        type: 'text',
                        required: true,
                      }
                      updateSetting('customFields', [...(settings.customFields ?? []), newField])
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Field
                  </Button>
                </div>
                {settings.customFields?.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/30 p-3">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...(settings.customFields ?? [])]
                          updated[index] = { ...field, label: e.target.value }
                          updateSetting('customFields', updated)
                        }}
                        placeholder="Field label (e.g. Birthday, Instagram)"
                        className="h-8 text-sm"
                      />
                      <div className="flex items-center gap-3">
                        <Select
                          value={field.type}
                          onValueChange={(val: 'text' | 'select') => {
                            const updated = [...(settings.customFields ?? [])]
                            updated[index] = { ...field, type: val, options: val === 'select' ? [''] : undefined }
                            updateSetting('customFields', updated)
                          }}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Switch
                            size="sm"
                            checked={field.required}
                            onCheckedChange={(checked) => {
                              const updated = [...(settings.customFields ?? [])]
                              updated[index] = { ...field, required: checked }
                              updateSetting('customFields', updated)
                            }}
                          />
                          Required
                        </label>
                      </div>
                      {field.type === 'select' && (
                        <div className="space-y-1.5">
                          {field.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-1.5">
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...(settings.customFields ?? [])]
                                  const newOpts = [...(field.options ?? [])]
                                  newOpts[optIdx] = e.target.value
                                  updated[index] = { ...field, options: newOpts }
                                  updateSetting('customFields', updated)
                                }}
                                placeholder={`Option ${optIdx + 1}`}
                                className="h-7 text-xs"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={() => {
                                  const updated = [...(settings.customFields ?? [])]
                                  const newOpts = (field.options ?? []).filter((_, i) => i !== optIdx)
                                  updated[index] = { ...field, options: newOpts }
                                  updateSetting('customFields', updated)
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 gap-1"
                            onClick={() => {
                              const updated = [...(settings.customFields ?? [])]
                              updated[index] = { ...field, options: [...(field.options ?? []), ''] }
                              updateSetting('customFields', updated)
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Add option
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => {
                        const updated = (settings.customFields ?? []).filter((_, i) => i !== index)
                        updateSetting('customFields', updated)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
              </div>

              <Separator />

              {/* What You Get Section */}
              {(() => {
                const currentBenefits = settings.benefits ?? generateDefaultBenefits(rewardsConfig, currency, language)
                const generatedBenefits = generateDefaultBenefits(rewardsConfig, currency, language)
                const RATE_IDS = ['base_cashback', 'max_cashback', 'referral_commission', 'welcome_bonus']
                const isOutOfSync = settings.benefits != null && RATE_IDS.some(id => {
                  const stored = settings.benefits!.find(b => b.id === id)
                  const generated = generatedBenefits.find(b => b.id === id)
                  return stored && generated && stored.text !== generated.text
                })
                const syncRates = () => {
                  const synced = currentBenefits.map(b => {
                    const fresh = generatedBenefits.find(g => g.id === b.id)
                    return fresh ? { ...b, text: fresh.text } : b
                  })
                  updateSetting('benefits', synced)
                }
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">What You Get</h2>
                      <div className="flex items-center gap-2">
                        {isOutOfSync && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:bg-amber-500/10"
                            onClick={syncRates}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Sync rates
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground"
                          onClick={() => updateSetting('benefits', generateDefaultBenefits(rewardsConfig, currency, language))}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            const newBenefit: Benefit = { id: `b_${Date.now()}`, text: '', icon: 'star' }
                            updateSetting('benefits', [...currentBenefits, newBenefit])
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Edit text, change icons, add your own perks. Hit Reset to regenerate from your rewards config.
                    </p>
                    <div className="space-y-1.5">
                      {currentBenefits.map((benefit, index) => {
                        const Icon = BENEFIT_ICON_MAP[benefit.icon]
                        return (
                          <div key={benefit.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-2 py-1.5">
                            <Select
                              value={benefit.icon}
                              onValueChange={(val) => {
                                const updated = [...currentBenefits]
                                updated[index] = { ...benefit, icon: val }
                                updateSetting('benefits', updated)
                              }}
                            >
                              <SelectTrigger className="h-7 w-12 shrink-0 px-1.5 border-0 bg-transparent">
                                <SelectValue>
                                  {Icon ? <Icon className="h-4 w-4" /> : null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {BENEFIT_ICON_OPTIONS.map((key) => {
                                  const BIcon = BENEFIT_ICON_MAP[key]
                                  return (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center gap-2">
                                        <BIcon className="h-4 w-4" />
                                        <span className="capitalize text-xs">{key}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                            <Input
                              value={benefit.text}
                              onChange={(e) => {
                                const updated = [...currentBenefits]
                                updated[index] = { ...benefit, text: e.target.value }
                                updateSetting('benefits', updated)
                              }}
                              placeholder="e.g. Free aftercare on all treatments"
                              className="h-7 text-sm flex-1 border-0 bg-transparent px-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0"
                              onClick={() => {
                                updateSetting('benefits', currentBenefits.filter((_, i) => i !== index))
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <Separator />

              {/* Cashback Journey */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Cashback Journey</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Show tier progression on your signup page</p>
                </div>
                <Switch
                  checked={settings.showTierProgression ?? true}
                  onCheckedChange={(checked) => updateSetting('showTierProgression', checked)}
                />
              </div>

              <Separator />

              {/* After Signup Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">After Signup</h2>
                <div className="space-y-2">
                  <Label>Success Heading</Label>
                  <Input
                    value={settings.successHeading ?? ''}
                    onChange={(e) => updateSetting('successHeading', e.target.value)}
                    placeholder="You're in!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Success Message</Label>
                  <Input
                    value={settings.successMessage ?? ''}
                    onChange={(e) => updateSetting('successMessage', e.target.value)}
                    placeholder="Welcome, {name}. Your loyalty card is ready."
                  />
                  <p className="text-xs text-muted-foreground">Use {'{name}'} to insert the customer&apos;s name</p>
                </div>
              </div>

              <Separator />

              {/* Legal Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Legal</h2>
                <div className="space-y-2">
                  <Label>Terms & Privacy URL</Label>
                  <Input
                    type="url"
                    value={settings.termsUrl ?? ''}
                    onChange={(e) => updateSetting('termsUrl', e.target.value)}
                    placeholder="https://yourstudio.com/terms"
                  />
                  {landingPage && settings.termsUrl === `${MARKETING_URL}/join/${landingPage.slug}/terms` ? (
                    <p className="text-xs text-muted-foreground">
                      Using your <a href={settings.termsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">auto-generated terms page</a> — replace with your own URL if you have one.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Shown as a link below the signup button</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Preview
            </label>
            <LandingPagePreview headline={headline} description={description} settings={settings} rewardsConfig={rewardsConfig} currency={currency} language={language} />
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Studio Identity */}
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0 space-y-5">
              <div>
                <h2 className="text-base font-semibold">Studio Identity</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Basic information about your studio</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-studio-name">Studio Name</Label>
                <Input
                  id="setup-studio-name"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="e.g. StreamInk Studio"
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-studio-email">Business Email</Label>
                <Input
                  id="setup-studio-email"
                  type="email"
                  value={studioEmail}
                  onChange={(e) => setStudioEmail(e.target.value)}
                  placeholder="hello@yourstudio.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-studio-phone">Phone</Label>
                <Input
                  id="setup-studio-phone"
                  type="tel"
                  value={studioPhone}
                  onChange={(e) => setStudioPhone(e.target.value)}
                  placeholder="+45 12 34 56 78"
                  autoComplete="tel"
                />
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Address</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="setup-street">Street Address</Label>
                    <Input
                      id="setup-street"
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      placeholder="Nørregade 1"
                      autoComplete="street-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="setup-city">City</Label>
                      <Input
                        id="setup-city"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        placeholder="Copenhagen"
                        autoComplete="address-level2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setup-postal">Postal Code</Label>
                      <Input
                        id="setup-postal"
                        value={addressPostalCode}
                        onChange={(e) => setAddressPostalCode(e.target.value)}
                        placeholder="1234"
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-country">Country</Label>
                    <Select value={addressCountry} onValueChange={setAddressCountry}>
                      <SelectTrigger id="setup-country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0 space-y-5">
              <div>
                <h2 className="text-base font-semibold">Regional Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">How amounts and text are displayed to customers</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-currency">Currency</Label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger id="setup-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Used for displaying amounts in rewards and customer views</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-language">Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger id="setup-language" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Language used on your customer-facing loyalty page</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-8">
          <TemplatePicker selected={selectedTemplateId} onSelect={handleTemplateSelect} />

          {!customizingRewards ? (
            <>
              <RewardsProgramPreview config={rewardsConfig} currency={currency} />
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCustomizingRewards(true)}
                  className="gap-2"
                >
                  <Paintbrush className="h-4 w-4" />
                  Customize this program
                </Button>
              </div>
            </>
          ) : (
          <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCustomizingRewards(false)}
              className="gap-1.5 -ml-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to templates
            </Button>
            {baseTemplateId !== 'custom' && (
              <p className="text-xs text-muted-foreground">
                Based on{' '}
                <span className="text-foreground font-medium">
                  {REWARD_TEMPLATES.find(t => t.id === baseTemplateId)?.name}
                </span>
              </p>
            )}
          </div>
          <div className="border-t border-border/50" />
          <ProgramOverview
            config={rewardsConfig}
            onChange={handleRewardsConfigChange}
            baseTemplate={REWARD_TEMPLATES.find(t => t.id === baseTemplateId)}
            currency={currency}
            hideWhyCashbackWorks
          />
          <div className="border-t border-border/50" />
          <ReferralProgram
            config={rewardsConfig}
            onChange={handleRewardsConfigChange}
            currency={currency}
          />
          </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
                Default images
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ImageUpload
                  ref={logoUploadRef}
                  label="Logo (required)"
                  hint="PNG, 480x150 px"
                  aspect={480 / 150}
                  targetWidth={480}
                  targetHeight={150}
                  currentUrl={logoUrl}
                  onUpload={handleCardLogoUpload}
                  onRemove={() => setLogoUrl(null)}
                  uploading={uploading}
                  removeBgType="graphic"
                />
                <ImageUpload
                  ref={stripUploadRef}
                  label="Strip"
                  hint="PNG, 1125x432 px"
                  aspect={1125 / 432}
                  targetWidth={1125}
                  targetHeight={432}
                  currentUrl={stripUrl}
                  placeholderUrl="/images/default-strip.png"
                  onUpload={handleStripUpload}
                  onRemove={() => setStripUrl(null)}
                  uploading={uploading}
                />
                <ImageUpload
                  ref={iconUploadRef}
                  label="Icon (required)"
                  hint="PNG, 512x512 px"
                  aspect={1}
                  targetWidth={512}
                  targetHeight={512}
                  currentUrl={iconUrl}
                  onUpload={handleIconUpload}
                  onRemove={() => setIconUrl(null)}
                  uploading={uploading}
                  removeBgType="graphic"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_380px] gap-6">
            <Card variant="glass" className="rounded-2xl">
              <CardContent className="pt-0">
                <TierList
                  tiers={visibleTierThemes}
                  selectedTier={selectedTier}
                  onSelect={setSelectedTier}
                />
              </CardContent>
            </Card>
            <Card variant="glass" className="rounded-2xl">
              <CardContent className="pt-0">
                <TierEditor
                  slug={selectedTier}
                  tier={currentTier}
                  onChange={handleTierChange}
                  onDelete={handleDeleteTier}
                  canDelete={selectedTier !== 'base'}
                  logoOverride={currentTier.logoOverride}
                  onLogoOverrideUpload={handleTierLogoUpload}
                  onLogoOverrideRemove={() => handleTierChange({ logoOverride: null })}
                  uploading={uploading}
                />
              </CardContent>
            </Card>
            <div className="flex flex-col items-center gap-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Live Preview</label>
              <CardPreview
                tierTheme={currentTier}
                logoUrl={logoUrl}
                stripUrl={stripUrl}
                studioName={currentStudio?.name ?? 'Studio'}
                cardFields={cardFields}
                iconUrl={iconUrl}
                onClickLogo={() => logoUploadRef.current?.trigger()}
                onClickStrip={() => stripUploadRef.current?.trigger()}
                onClickIcon={() => iconUploadRef.current?.trigger()}
              />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0 space-y-6">
              <h2 className="text-lg font-semibold">Review Your Setup</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Landing page summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Landing Page
                  </h3>
                  <LandingPagePreview headline={headline} description={description} settings={settings} rewardsConfig={rewardsConfig} currency={currency} language={language} />
                </div>

                {/* Card preview summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Wallet Card
                  </h3>
                  <CardPreview
                    tierTheme={currentTier}
                    logoUrl={logoUrl}
                    stripUrl={stripUrl}
                    studioName={currentStudio?.name ?? 'Studio'}
                    cardFields={cardFields}
                    iconUrl={iconUrl}
                  />
                </div>

                {/* Rewards summary */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Rewards Program
                  </h3>

                  {/* Tier journey */}
                  <div className="flex items-stretch gap-3 flex-wrap">
                    {rewardsConfig.tiers.map((tier, i) => {
                      const theme = visibleTierThemes[tier.slug] ?? DEFAULT_TIER_THEMES[tier.slug]
                      return (
                        <div key={tier.slug} className="flex items-center gap-3">
                          {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                          <div
                            className="rounded-xl border border-border/30 px-4 py-3 min-w-[120px]"
                            style={{ backgroundColor: theme?.backgroundColor, color: theme?.foregroundColor }}
                          >
                            <p className="text-xl font-bold">{tier.cashback_rate}%</p>
                            <p className="text-xs font-medium opacity-80">{tier.name}</p>
                            {tier.upgrade_trigger && (
                              <p className="text-[10px] opacity-60 mt-1" style={{ color: theme?.labelColor }}>
                                {getTriggerLabel(tier.upgrade_trigger, currency)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {rewardsConfig.referrals.enabled && (() => {
                      const refSlug = rewardsConfig.referrals.friend_tier_slug
                      const refTheme = visibleTierThemes[refSlug] ?? DEFAULT_TIER_THEMES[refSlug]
                      return (
                        <div className="flex items-center gap-3">
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <div
                            className="rounded-xl border border-border/30 px-4 py-3 min-w-[120px]"
                            style={{ backgroundColor: refTheme?.backgroundColor ?? '#1a1a1a', color: refTheme?.foregroundColor ?? '#fff' }}
                          >
                            <p className="text-xl font-bold">{rewardsConfig.referrals.referrer_cashback_cap}%</p>
                            <p className="text-xs font-medium opacity-80">Max Cashback</p>
                            <p className="text-[10px] opacity-60 mt-1" style={{ color: refTheme?.labelColor }}>
                              +{rewardsConfig.referrals.referrer_cashback_bonus_per_ref}% per referral
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Referral details */}
                  {rewardsConfig.referrals.enabled && (
                    <p className="text-xs text-muted-foreground">
                      Referred friends get {rewardsConfig.referrals.friend_cashback_rate}% cashback{rewardsConfig.referrals.friend_welcome_bonus > 0 ? ` + ${formatAmount(rewardsConfig.referrals.friend_welcome_bonus, getCurrencyConfig(currency))} welcome bonus` : ''}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stories teaser */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Promote your program with AI Stories</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Once you go live, use the Stories tool to generate four ready-to-post Instagram Stories — built around your brand colors, your cashback rates, and your signup link. It&apos;s the fastest way to get your first members in the door.
              </p>
            </div>
          </div>

          {/* Download App prompt */}
          <DownloadAppCard />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {step < 4 ? (
          <Button variant="glow" onClick={handleNext} className="gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="glow" onClick={handleGoLive} className="gap-2">
            <Rocket className="h-4 w-4" />
            Go Live
          </Button>
        )}
      </div>

      {/* Go Live Success Dialog */}
      <Dialog open={showLiveDialog} onOpenChange={setShowLiveDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PartyPopper className="h-6 w-6 text-primary" />
              You&apos;re Live!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">
              Your loyalty program is ready. Choose how you want to share it with customers.
            </p>

            {landingPage && (
              <Tabs defaultValue="share">
                <TabsList className="w-full">
                  <TabsTrigger value="share" className="flex-1">Share & QR Code</TabsTrigger>
                  <TabsTrigger value="embed" className="flex-1">Embed on Website</TabsTrigger>
                </TabsList>

                <TabsContent value="share" className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" /> Signup Link
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={`${MARKETING_URL}/join/${landingPage.slug}`}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${MARKETING_URL}/join/${landingPage.slug}`)
                          setLinkCopied(true)
                          setTimeout(() => setLinkCopied(false), 2000)
                        }}
                      >
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                      QR Code for Front Desk
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Print this and place it at your front desk or reception. Customers scan it with their phone camera to sign up instantly — no link needed.
                    </p>
                    <div className="flex justify-center pt-1">
                      <SignupQR
                        url={`${MARKETING_URL}/join/${landingPage.slug}`}
                        studioName={currentStudio?.name}
                        size={160}
                        className="w-48"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="embed" className="pt-2">
                  <EmbedCode slug={landingPage.slug} />
                </TabsContent>
              </Tabs>
            )}

            <Button
              className="w-full gap-2"
              variant="glow"
              onClick={() => {
                setShowLiveDialog(false)
                router.push('/overview')
              }}
            >
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

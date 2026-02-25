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
import { Switch } from '@/components/ui/switch'
import { ArrowRight, Check, ChevronRight, ChevronLeft, Rocket, Palette, CreditCard, Eye, Copy, PartyPopper, Link as LinkIcon, Gift, Plus, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { APP_URL } from '@/lib/constants'
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
import { RewardsConfigForm, getTriggerLabel } from '@/components/rewards/rewards-config-form'
import { ProgramOverview } from '@/components/rewards/program-overview'
import { ReferralProgram } from '@/components/rewards/referral-program'

const STEPS = [
  { label: 'Rewards Program', icon: Gift },
  { label: 'Card Designer', icon: CreditCard },
  { label: 'Landing Page', icon: Palette },
  { label: 'Review & Go Live', icon: Rocket },
]

export default function SetupPage() {
  const router = useRouter()
  const { currentStudio } = useStudio()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [showLiveDialog, setShowLiveDialog] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

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
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfig>(DEFAULT_REWARDS_CONFIG)

  const [selectedTier, setSelectedTier] = useState(DEFAULT_REWARDS_CONFIG.tiers[0].slug)
  const [tierThemes, setTierThemes] = useState<Record<string, TierTheme>>(DEFAULT_TIER_THEMES)
  const [cardFields, setCardFields] = useState<CardField[]>(DEFAULT_CARD_FIELDS)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)

  const logoUploadRef = useRef<ImageUploadHandle>(null)
  const stripUploadRef = useRef<ImageUploadHandle>(null)
  const iconUploadRef = useRef<ImageUploadHandle>(null)

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
      if (s) setSettings({ ...DEFAULT_LANDING_SETTINGS, ...s })
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
    if (typeof s?.onboarding_step === 'number') {
      const restored = s.onboarding_step as number
      // Clamp to max step (3) in case coming from a previous 5-step version
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(Math.min(restored, 3))
    }
    if (s?.rewards_config) {
      setRewardsConfig(migrateRewardsConfig(s.rewards_config))
    }
  }, [currentStudio?.id])

  // Auto-generate tier themes for new tier slugs
  useEffect(() => {
    const newThemes = { ...tierThemes }
    let changed = false
    for (const tier of rewardsConfig.tiers) {
      if (!newThemes[tier.slug]) {
        newThemes[tier.slug] = DEFAULT_TIER_THEMES[tier.slug] ?? {
          name: tier.name,
          backgroundColor: '#333333',
          foregroundColor: '#FFFFFF',
          labelColor: '#AAAAAA',
          stripImage: null,
          logoOverride: null,
          sortOrder: Object.keys(newThemes).length,
        }
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
    if (!currentStudio) return
    await supabase
      .from('studios')
      .update({
        settings: {
          ...(currentStudio.settings as Record<string, unknown>),
          rewards_config: rewardsConfig,
        },
      })
      .eq('id', currentStudio.id)
  }

  const saveStepProgress = async (nextStep: number) => {
    if (!currentStudio) return
    await supabase
      .from('studios')
      .update({
        settings: {
          ...(currentStudio.settings as Record<string, unknown>),
          onboarding_step: nextStep,
          onboarding_version: 2,
        },
      })
      .eq('id', currentStudio.id)
  }

  const handleNext = async () => {
    try {
      if (step === 0) await saveRewardsConfig()
      if (step === 1) await saveCardDesigner()
      if (step === 2) await saveLandingPage()
      const nextStep = step + 1
      await saveStepProgress(nextStep)
      setStep(nextStep)
    } catch {
      toast.error('Failed to save. Please try again.')
    }
  }

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1))
  }

  const handleGoLive = async () => {
    try {
      await saveLandingPage()
      await saveCardDesigner()
      await saveRewardsConfig()
      if (!currentStudio) return
      await supabase
        .from('studios')
        .update({
          settings: {
            ...(currentStudio.settings as Record<string, unknown>),
            rewards_config: rewardsConfig,
            onboarding_completed: true,
            onboarding_step: 3,
            onboarding_version: 2,
          },
        })
        .eq('id', currentStudio.id)
      setShowLiveDialog(true)
    } catch {
      toast.error('Failed to go live. Please try again.')
    }
  }

  const currency = ((currentStudio?.settings as Record<string, unknown>)?.currency as string) ?? 'dkk'

  // Filter tiers to only show active ones (from rewards config) + custom tiers.
  // Always include a theme entry for every active slug, generating defaults for missing ones.
  const activeSlugs = getActiveTierSlugs(rewardsConfig)
  const visibleTierThemes: Record<string, TierTheme> = {}
  for (const slug of activeSlugs) {
    visibleTierThemes[slug] = tierThemes[slug] ?? DEFAULT_TIER_THEMES[slug] ?? {
      name: rewardsConfig.tiers.find(t => t.slug === slug)?.name ?? slug,
      backgroundColor: '#333333',
      foregroundColor: '#FFFFFF',
      labelColor: '#AAAAAA',
      stripImage: null,
      logoOverride: null,
      sortOrder: Object.keys(visibleTierThemes).length,
    }
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
      {step === 2 && (
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
                  />
                </div>
              </div>

              <Separator />

              {/* Branding Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Branding</h2>
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
                const currentBenefits = settings.benefits ?? generateDefaultBenefits(rewardsConfig, currency)
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">What You Get</h2>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground"
                          onClick={() => updateSetting('benefits', generateDefaultBenefits(rewardsConfig, currency))}
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
                  <p className="text-xs text-muted-foreground">Shown as a link below the signup button</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Preview
            </label>
            <LandingPagePreview headline={headline} description={description} settings={settings} rewardsConfig={rewardsConfig} currency={currency} />
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-8">
          <ProgramOverview
            config={rewardsConfig}
            onChange={setRewardsConfig}
          />
          <div className="border-t border-border/50" />
          <ReferralProgram
            config={rewardsConfig}
            onChange={setRewardsConfig}
          />
          <RewardsConfigForm
            config={rewardsConfig}
            onChange={setRewardsConfig}
            fromSetup
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
                Default images
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ImageUpload
                  ref={logoUploadRef}
                  label="Logo"
                  hint="PNG, 480x150 px"
                  aspect={480 / 150}
                  targetWidth={480}
                  targetHeight={150}
                  currentUrl={logoUrl}
                  onUpload={handleCardLogoUpload}
                  onRemove={() => setLogoUrl(null)}
                  uploading={uploading}
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
                  label="Icon"
                  hint="PNG, 512x512 px"
                  aspect={1}
                  targetWidth={512}
                  targetHeight={512}
                  currentUrl={iconUrl}
                  onUpload={handleIconUpload}
                  onRemove={() => setIconUrl(null)}
                  uploading={uploading}
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

      {step === 3 && (
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
                  <LandingPagePreview headline={headline} description={description} settings={settings} rewardsConfig={rewardsConfig} currency={currency} />
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
                                {getTriggerLabel(tier.upgrade_trigger)}
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
                      Referred friends get {rewardsConfig.referrals.friend_cashback_rate}% cashback + {rewardsConfig.referrals.friend_welcome_bonus} kr welcome bonus
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
        {step < 3 ? (
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PartyPopper className="h-6 w-6 text-primary" />
              You&apos;re Live!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">
              Your loyalty program is ready. Share your signup page with customers to start growing your community.
            </p>

            {/* Join Link */}
            {landingPage && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5" /> Your Signup Link
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${APP_URL}/join/${landingPage.slug}`}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${APP_URL}/join/${landingPage.slug}`)
                        setLinkCopied(true)
                        setTimeout(() => setLinkCopied(false), 2000)
                      }}
                    >
                      {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {linkCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <EmbedCode slug={landingPage.slug} />
              </div>
            )}

            <Button
              className="w-full gap-2"
              variant="glow"
              onClick={() => {
                setShowLiveDialog(false)
                router.push('/')
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

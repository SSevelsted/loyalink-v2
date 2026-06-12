'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Switch } from '@/components/ui/switch'
import { usePassTemplates, useUpdatePassTemplate, useEnsureDefaultTemplate } from '@/hooks/use-wallet'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useStudio } from '@/hooks/use-studio'
import { CardPreview } from '@/components/wallet/card-preview'
import { TierList } from '@/components/wallet/tier-list'
import { TierEditor } from '@/components/wallet/tier-editor'
import { ImageUpload, type ImageUploadHandle } from '@/components/wallet/image-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Link, Copy, Check, Eye, ImagePlus, Plus, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { TierTheme, CardField } from '@/types/database'
import { DEFAULT_TIER_THEMES, DEFAULT_CARD_FIELDS, DEFAULT_REWARDS_CONFIG, getActiveTierSlugs, migrateRewardsConfig } from '@/types/database'
import { useRewardsConfig } from '@/hooks/use-rewards'
import { useLandingPage, useUpdateLandingPage, useEnsureLandingPage, DEFAULT_LANDING_SETTINGS, resolveLandingPageSettings } from '@/hooks/use-landing-page'
import type { LandingPageSettings, Benefit } from '@/hooks/use-landing-page'
import { LandingPagePreview } from '@/components/landing/landing-page-preview'
import { EmbedCode } from '@/components/landing/embed-code'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MARKETING_URL } from '@/lib/constants'
import { generateDefaultBenefits, BENEFIT_ICON_MAP, BENEFIT_ICON_OPTIONS } from '@/components/landing/value-stack'
import {
  localizeLandingPageDefaults,
  localizeLandingPageSettingsDefaults,
  resolveLandingPageCopy,
} from '@/lib/landing-page-defaults'

// Only the first tier is protected from deletion; custom tiers can be removed
const FIRST_TIER_SLUG = DEFAULT_REWARDS_CONFIG.tiers[0].slug

export default function WalletPage() {
  const { currentStudio } = useStudio()
  const { data: templates, isLoading } = usePassTemplates()
  const updateTemplate = useUpdatePassTemplate()
  const ensureTemplate = useEnsureDefaultTemplate()
  const { upload, uploading } = useImageUpload()
  const { data: rewardsConfig } = useRewardsConfig()

  const [selectedTier, setSelectedTier] = useState(FIRST_TIER_SLUG)
  const [tierThemes, setTierThemes] = useState<Record<string, TierTheme>>(DEFAULT_TIER_THEMES)
  const [cardFields, setCardFields] = useState<CardField[]>(DEFAULT_CARD_FIELDS)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Refs for triggering uploads from preview clicks
  const logoUploadRef = useRef<ImageUploadHandle>(null)
  const stripUploadRef = useRef<ImageUploadHandle>(null)
  const iconUploadRef = useRef<ImageUploadHandle>(null)
  const lpLogoTouchedRef = useRef(false)

  // Landing page state
  const { data: landingPage, isLoading: lpLoading } = useLandingPage()
  const updateLandingPage = useUpdateLandingPage()
  const ensureLandingPage = useEnsureLandingPage()
  const [lpHeadline, setLpHeadline] = useState('')
  const [lpDescription, setLpDescription] = useState('')
  const [lpSettings, setLpSettings] = useState<LandingPageSettings>(DEFAULT_LANDING_SETTINGS)
  const [lpDirty, setLpDirty] = useState(false)

  const template = templates?.[0]
  const studioSettings = (currentStudio?.settings ?? {}) as Record<string, unknown>
  const lpCurrency = lpSettings.currency ?? (studioSettings.currency as string) ?? 'dkk'
  const lpLanguage = lpSettings.language ?? (studioSettings.language as string) ?? 'en'

  // Ensure landing page exists
  useEffect(() => {
    if (!lpLoading && !landingPage && currentStudio) {
      ensureLandingPage.mutate()
    }
  }, [lpLoading, landingPage, currentStudio])

  // Load landing page data
  useEffect(() => {
    if (landingPage) {
      const s = landingPage.settings as LandingPageSettings | null
      const loadedSettings = resolveLandingPageSettings(s, {
        defaultLogoUrl: landingPage.hero_image_url,
      })
      const loadedLanguage = loadedSettings.language ?? (studioSettings.language as string | undefined) ?? 'en'
      const localized = localizeLandingPageDefaults({
        studioName: currentStudio?.name,
        language: loadedLanguage,
        headline: landingPage.headline ?? '',
        description: landingPage.description ?? '',
        settings: loadedSettings,
      })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLpHeadline(localized.headline)
      setLpDescription(localized.description)
      setLpSettings(localized.settings)
    }
  }, [landingPage?.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLpHeadline((prev) => resolveLandingPageCopy(prev, 'headline', currentStudio?.name, lpLanguage))
    setLpDescription((prev) => resolveLandingPageCopy(prev, 'description', currentStudio?.name, lpLanguage))
    setLpSettings((prev) => localizeLandingPageSettingsDefaults(prev, currentStudio?.name, lpLanguage))
  }, [currentStudio?.name, lpLanguage])

  const updateLpSetting = (key: keyof LandingPageSettings, value: unknown) => {
    if (key === 'logoUrl') lpLogoTouchedRef.current = true
    setLpSettings((prev) => ({ ...prev, [key]: value }))
    setLpDirty(true)
  }

  useEffect(() => {
    if (!iconUrl || lpSettings.logoUrl || lpLogoTouchedRef.current) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLpSettings((prev) => prev.logoUrl ? prev : { ...prev, logoUrl: iconUrl })
    setLpDirty(true)
  }, [iconUrl, lpSettings.logoUrl])

  const handleLpLogoUpload = async (file: File) => {
    const url = await upload(file, 'landing_logo.png')
    if (url) updateLpSetting('logoUrl', url)
  }

  const handleLpSave = async () => {
    if (!landingPage) return
    try {
      await updateLandingPage.mutateAsync({
        id: landingPage.id,
        headline: lpHeadline,
        description: lpDescription,
        settings: { ...lpSettings, currency: lpCurrency, language: lpLanguage } as unknown as Record<string, unknown>,
        hero_image_url: lpSettings.logoUrl,
      })
      setLpDirty(false)
      toast.success('Landing page saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  const handleCopyLink = async () => {
    if (!landingPage) return
    await navigator.clipboard.writeText(`${MARKETING_URL}/join/${landingPage.slug}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // Ensure a default template exists
  useEffect(() => {
    if (!isLoading && !templates?.length && currentStudio) {
      ensureTemplate.mutate()
    }
  }, [isLoading, templates?.length, currentStudio])

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
      if (fields && fields.length > 0) {
        setCardFields(fields)
      }
      setLogoUrl(template.logo_url)
      setIconUrl(template.icon_url)
      const loadedThemes = template.tier_themes as Record<string, TierTheme> | undefined
      const firstTheme = loadedThemes ? loadedThemes[Object.keys(loadedThemes)[0]] : undefined
      setStripUrl(firstTheme?.stripImage ?? null)
    }
  }, [template?.id])

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
      setDirty(true)
    },
    [selectedTier]
  )

  const handleAddTier = useCallback(() => {
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
    setDirty(true)
  }, [])

  const handleDeleteTier = useCallback(() => {
    setTierThemes((prev) => {
      const next = { ...prev }
      delete next[selectedTier]
      return next
    })
    setSelectedTier(FIRST_TIER_SLUG)
    setDirty(true)
  }, [selectedTier])

  const handleLogoUpload = async (file: File) => {
    const url = await upload(file, 'logo.png')
    if (url) {
      setLogoUrl(url)
      setDirty(true)
    }
  }

  const handleStripUpload = async (file: File) => {
    const url = await upload(file, 'strip.png')
    if (url) {
      setStripUrl(url)
      setDirty(true)
    }
  }

  const handleIconUpload = async (file: File) => {
    const url = await upload(file, 'icon.png')
    if (url) {
      setIconUrl(url)
      setDirty(true)
    }
  }

  const handleTierLogoUpload = async (file: File) => {
    const url = await upload(file, `logo_${selectedTier}.png`)
    if (url) {
      handleTierChange({ logoOverride: url })
    }
  }

  const handleSave = async () => {
    if (!template || !currentStudio) return
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        tier_themes: tierThemes as unknown as Record<string, unknown>,
        card_fields: cardFields as unknown[],
        logo_url: logoUrl,
        icon_url: iconUrl,
      })
      setDirty(false)
      toast.success('Card design saved — pushing to installed passes…')

      // Push updated design to all installed passes in the background
      fetch('/api/pass/push/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio.id }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            const total = (data.apple?.sent ?? 0) + (data.google?.updated ?? 0)
            if (total > 0) toast.success(`Design pushed to ${total} installed pass${total === 1 ? '' : 'es'}`)
          }
        })
        .catch(() => {
          // Push failure is non-critical — design is saved, passes will update on next open
        })
    } catch {
      toast.error('Failed to save')
    }
  }

  // Filter tiers to only show active ones (from rewards config) + custom tiers.
  // Always include a theme entry for every active slug, generating defaults for missing ones.
  const activeSlugs = rewardsConfig ? getActiveTierSlugs(rewardsConfig) : DEFAULT_REWARDS_CONFIG.tiers.map(t => t.slug)
  const visibleTierThemes: Record<string, TierTheme> = {}
  for (const slug of activeSlugs) {
    visibleTierThemes[slug] = tierThemes[slug] ?? DEFAULT_TIER_THEMES[slug] ?? {
      name: slug,
      backgroundColor: '#333333',
      foregroundColor: '#FFFFFF',
      labelColor: '#AAAAAA',
      stripImage: null,
      logoOverride: null,
      sortOrder: Object.keys(visibleTierThemes).length,
    }
  }
  for (const [slug, theme] of Object.entries(tierThemes)) {
    if (slug.startsWith('custom_') && !visibleTierThemes[slug]) {
      visibleTierThemes[slug] = theme
    }
  }

  // Guard: fall back to 'base' if selected tier is no longer visible
  useEffect(() => {
    const isVisible = activeSlugs.includes(selectedTier) || selectedTier.startsWith('custom_')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isVisible) setSelectedTier(activeSlugs[0] ?? FIRST_TIER_SLUG)
  }, [rewardsConfig, selectedTier])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-96 animate-shimmer rounded-xl" />
      </div>
    )
  }

  const currentTier = visibleTierThemes[selectedTier]
    ?? Object.values(visibleTierThemes)[0]
    ?? DEFAULT_TIER_THEMES[DEFAULT_REWARDS_CONFIG.tiers[0].slug]

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Wallet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design cards, manage templates and push updates
          </p>
        </div>
        <Button
          variant="glow"
          onClick={handleSave}
          disabled={!dirty || !logoUrl || !iconUrl || updateTemplate.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateTemplate.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Tabs defaultValue="designer">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="designer">Card Designer</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
        </TabsList>

        {/* ── Designer Tab ── */}
        <TabsContent value="designer" className="space-y-6 mt-4">
          {/* Getting started hint */}
          {(!logoUrl || !iconUrl) && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <ImagePlus className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {!logoUrl && !iconUrl ? 'Upload a logo and icon to continue' : !logoUrl ? 'Upload a logo to continue' : 'Upload an icon to continue'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">A logo and icon are required before you can save your card design.</p>
              </div>
            </div>
          )}

          {/* Bulk image uploads */}
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
                Brand Images
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ImageUpload
                  ref={logoUploadRef}
                  label="Logo"
                  hint="PNG, 480×150 px (wide)"
                  aspect={480 / 150}
                  targetWidth={480}
                  targetHeight={150}
                  currentUrl={logoUrl}
                  onUpload={handleLogoUpload}
                  onRemove={() => { setLogoUrl(null); setDirty(true) }}
                  uploading={uploading}
                  removeBgType="graphic"
                />
                <ImageUpload
                  ref={stripUploadRef}
                  label="Strip / Center Image"
                  hint="PNG, 1125×432 px (wide banner)"
                  aspect={1125 / 432}
                  targetWidth={1125}
                  targetHeight={432}
                  currentUrl={stripUrl}
                  placeholderUrl="/images/default-strip.png"
                  onUpload={handleStripUpload}
                  onRemove={() => { setStripUrl(null); setDirty(true) }}
                  uploading={uploading}
                />
                <ImageUpload
                  ref={iconUploadRef}
                  label="Icon (Google & Notifications)"
                  hint="PNG, 512×512 px (1:1 square)"
                  aspect={1}
                  targetWidth={512}
                  targetHeight={512}
                  currentUrl={iconUrl}
                  onUpload={handleIconUpload}
                  onRemove={() => { setIconUrl(null); setDirty(true) }}
                  uploading={uploading}
                  removeBgType="graphic"
                />
              </div>
            </CardContent>
          </Card>

          {/* Main editor layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_380px] gap-6">
            {/* Tier list */}
            <Card variant="glass" className="rounded-2xl">
              <CardContent className="pt-0">
                <TierList
                  tiers={visibleTierThemes}
                  selectedTier={selectedTier}
                  onSelect={setSelectedTier}
                  onAddTier={handleAddTier}
                />
              </CardContent>
            </Card>

            {/* Tier editor */}
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

            {/* Live preview */}
            <div className="flex flex-col items-center gap-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Live Preview
              </label>
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
        </TabsContent>

        {/* ── Landing Page Tab ── */}
        <TabsContent value="landing" className="space-y-6 mt-4">
          {(() => {
            const lpRewardsConfig = migrateRewardsConfig(studioSettings.rewards_config)
            const lpBenefits = lpSettings.benefits ?? generateDefaultBenefits(lpRewardsConfig, lpCurrency, lpLanguage)

            return (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Editor */}
                <Card variant="glass" className="rounded-2xl">
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Landing Page Settings</h2>
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={handleLpSave}
                        disabled={!lpDirty || updateLandingPage.isPending}
                        className="gap-2"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {updateLandingPage.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Headline</Label>
                      <Input value={lpHeadline} onChange={(e) => { setLpHeadline(e.target.value); setLpDirty(true) }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={lpDescription} onChange={(e) => { setLpDescription(e.target.value); setLpDirty(true) }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Brand Color</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={lpSettings.brandColor} onChange={(e) => updateLpSetting('brandColor', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                          <Input value={lpSettings.brandColor} onChange={(e) => updateLpSetting('brandColor', e.target.value)} className="font-mono text-xs" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Background</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={lpSettings.backgroundColor} onChange={(e) => updateLpSetting('backgroundColor', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                          <Input value={lpSettings.backgroundColor} onChange={(e) => updateLpSetting('backgroundColor', e.target.value)} className="font-mono text-xs" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={lpSettings.textColor} onChange={(e) => updateLpSetting('textColor', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                          <Input value={lpSettings.textColor} onChange={(e) => updateLpSetting('textColor', e.target.value)} className="font-mono text-xs" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Button Text</Label>
                      <Input value={lpSettings.buttonText} onChange={(e) => updateLpSetting('buttonText', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo</Label>
                      <ImageUpload
                        label="Logo"
                        hint="PNG, square"
                        aspect={1}
                        targetWidth={256}
                        targetHeight={256}
                        currentUrl={lpSettings.logoUrl}
                        onUpload={handleLpLogoUpload}
                        onRemove={() => updateLpSetting('logoUrl', null)}
                        uploading={uploading}
                        removeBgType="graphic"
                      />
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          size="sm"
                          checked={lpSettings.showEmail}
                          onCheckedChange={(checked) => updateLpSetting('showEmail', checked)}
                        />
                        Show Email Field
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          size="sm"
                          checked={lpSettings.showPhone}
                          onCheckedChange={(checked) => updateLpSetting('showPhone', checked)}
                        />
                        Show Phone Field
                      </label>
                    </div>

                    <Separator />

                    {/* What You Get */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">What You Get</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs text-muted-foreground"
                            onClick={() => {
                              updateLpSetting('benefits', generateDefaultBenefits(lpRewardsConfig, lpCurrency, lpLanguage))
                            }}
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
                              updateLpSetting('benefits', [...lpBenefits, newBenefit])
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Edit text, change icons, add your own perks. Hit Reset to regenerate from your rewards config.
                      </p>
                      <div className="space-y-1.5">
                        {lpBenefits.map((benefit, index) => {
                          const Icon = BENEFIT_ICON_MAP[benefit.icon]
                          return (
                            <div key={benefit.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-2 py-1.5">
                              <Select
                                value={benefit.icon}
                                onValueChange={(val) => {
                                  const updated = [...lpBenefits]
                                  updated[index] = { ...benefit, icon: val }
                                  updateLpSetting('benefits', updated)
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
                                  const updated = [...lpBenefits]
                                  updated[index] = { ...benefit, text: e.target.value }
                                  updateLpSetting('benefits', updated)
                                }}
                                placeholder="e.g. Free aftercare on all treatments"
                                className="h-7 text-sm flex-1 border-0 bg-transparent px-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={() => {
                                  updateLpSetting('benefits', lpBenefits.filter((_, i) => i !== index))
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Cashback Journey toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold">Cashback Journey</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Show tier progression on the signup page</p>
                      </div>
                      <Switch
                        checked={lpSettings.showTierProgression ?? true}
                        onCheckedChange={(checked) => updateLpSetting('showTierProgression', checked)}
                      />
                    </div>

                    {/* Share Section */}
                    {landingPage && (
                      <div className="border-t border-border/30 pt-4 space-y-4">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <Link className="h-4 w-4" /> Share
                        </h3>
                        <div className="flex items-center gap-2">
                          <Input value={`${MARKETING_URL}/join/${landingPage.slug}`} readOnly className="font-mono text-xs" />
                          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 shrink-0">
                            {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {linkCopied ? 'Copied' : 'Copy'}
                          </Button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            <Eye className="h-3.5 w-3.5 inline mr-1" />
                            {landingPage.view_count ?? 0} views
                          </span>
                          <span className="text-muted-foreground">
                            {landingPage.signup_count ?? 0} signups
                          </span>
                        </div>

                        {/* Embed Code */}
                        <EmbedCode slug={landingPage.slug} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Preview */}
                <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6 lg:self-start">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </label>
                  <LandingPagePreview
                    headline={lpHeadline}
                    description={lpDescription}
                    settings={{ ...lpSettings, benefits: lpBenefits }}
                    rewardsConfig={lpRewardsConfig}
                    currency={lpCurrency}
                    language={lpLanguage}
                  />
                </div>
              </div>
            )
          })()}
        </TabsContent>

      </Tabs>
    </div>
  )
}

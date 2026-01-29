'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { ImageUpload } from '@/components/wallet/image-upload'
import { LandingPagePreview } from '@/components/landing/landing-page-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmbedCode } from '@/components/landing/embed-code'
import { Check, ChevronRight, ChevronLeft, Rocket, Palette, CreditCard, Eye, Copy, PartyPopper, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { APP_URL } from '@/lib/constants'
import type { TierTheme, CardField } from '@/types/database'
import { DEFAULT_TIER_THEMES, DEFAULT_CARD_FIELDS } from '@/types/database'

const STEPS = [
  { label: 'Landing Page', icon: Palette },
  { label: 'Card Designer', icon: CreditCard },
  { label: 'Review & Go Live', icon: Rocket },
]

const DEFAULT_SLUGS = ['base', 'loyalty_club', 'referral_1', 'referral_2', 'referral_3', 'inner_circle']

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

  const [selectedTier, setSelectedTier] = useState('base')
  const [tierThemes, setTierThemes] = useState<Record<string, TierTheme>>(DEFAULT_TIER_THEMES)
  const [cardFields, setCardFields] = useState<CardField[]>(DEFAULT_CARD_FIELDS)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)

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
      if (themes && Object.keys(themes).length > 0) setTierThemes(themes)
      const fields = template.card_fields as CardField[] | null
      if (fields && fields.length > 0) setCardFields(fields)
      setLogoUrl(template.logo_url)
      setIconUrl(template.icon_url)
      setStripUrl((template.tier_themes as Record<string, TierTheme>)?.base?.stripImage ?? null)
    }
  }, [template?.id])

  // Restore step from studio settings
  useEffect(() => {
    const s = currentStudio?.settings as Record<string, unknown> | undefined
    if (typeof s?.onboarding_step === 'number') {
      setStep(s.onboarding_step as number)
    }
  }, [currentStudio?.id])

  const updateSetting = (key: keyof LandingPageSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogoUpload = async (file: File) => {
    const url = await upload(file, 'landing_logo.png')
    if (url) updateSetting('logoUrl', url)
  }

  const handleTierChange = useCallback(
    (updates: Partial<TierTheme>) => {
      setTierThemes((prev) => ({
        ...prev,
        [selectedTier]: { ...prev[selectedTier], ...updates },
      }))
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
        cashbackRate: 0,
        minSpend: 0,
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
    setSelectedTier('base')
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

  const saveStepProgress = async (nextStep: number) => {
    if (!currentStudio) return
    await supabase
      .from('studios')
      .update({
        settings: {
          ...(currentStudio.settings as Record<string, unknown>),
          onboarding_step: nextStep,
        },
      })
      .eq('id', currentStudio.id)
  }

  const handleNext = async () => {
    try {
      if (step === 0) await saveLandingPage()
      if (step === 1) await saveCardDesigner()
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
      if (!currentStudio) return
      await supabase
        .from('studios')
        .update({
          settings: {
            ...(currentStudio.settings as Record<string, unknown>),
            onboarding_completed: true,
            onboarding_step: 2,
          },
        })
        .eq('id', currentStudio.id)
      setShowLiveDialog(true)
    } catch {
      toast.error('Failed to go live. Please try again.')
    }
  }

  if (lpLoading || tplLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-96 animate-shimmer rounded-xl" />
      </div>
    )
  }

  const currentTier = tierThemes[selectedTier]

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
      {step === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0 space-y-4">
              <h2 className="text-lg font-semibold">Customize Your Signup Page</h2>

              <div className="space-y-2">
                <Label>Headline</Label>
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
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
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showEmail}
                    onChange={(e) => updateSetting('showEmail', e.target.checked)}
                    className="rounded"
                  />
                  Show Email Field
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showPhone}
                    onChange={(e) => updateSetting('showPhone', e.target.checked)}
                    className="rounded"
                  />
                  Show Phone Field
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Preview
            </label>
            <LandingPagePreview headline={headline} description={description} settings={settings} />
          </div>
        </div>
      )}

      {step === 1 && currentTier && (
        <div className="space-y-6">
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
                Default images
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImageUpload
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
                  label="Strip"
                  hint="PNG, 1125x432 px"
                  aspect={1125 / 432}
                  targetWidth={1125}
                  targetHeight={432}
                  currentUrl={stripUrl}
                  onUpload={handleStripUpload}
                  onRemove={() => setStripUrl(null)}
                  uploading={uploading}
                />
                <ImageUpload
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
                <div />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_380px] gap-6">
            <Card variant="glass" className="rounded-2xl">
              <CardContent className="pt-0">
                <TierList
                  tiers={tierThemes}
                  selectedTier={selectedTier}
                  onSelect={setSelectedTier}
                  onAddTier={handleAddTier}
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
                  canDelete={!DEFAULT_SLUGS.includes(selectedTier)}
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
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
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
                  <LandingPagePreview headline={headline} description={description} settings={settings} />
                </div>

                {/* Card preview summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Wallet Card
                  </h3>
                  {currentTier && (
                    <CardPreview
                      tierTheme={currentTier}
                      logoUrl={logoUrl}
                      stripUrl={stripUrl}
                      studioName={currentStudio?.name ?? 'Studio'}
                      cardFields={cardFields}
                      iconUrl={iconUrl}
                    />
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
        {step < 2 ? (
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

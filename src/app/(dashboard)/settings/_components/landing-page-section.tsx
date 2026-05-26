'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from '@/components/wallet/image-upload'
import { LandingPagePreview } from '@/components/landing/landing-page-preview'
import { useLandingPages, useCreateLandingPage, useUpdateLandingPage, DEFAULT_LANDING_SETTINGS } from '@/hooks/use-landing-page'
import type { LandingPageSettings, CustomField, Benefit } from '@/hooks/use-landing-page'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useStudio } from '@/hooks/use-studio'
import { toast } from 'sonner'
import { FileText, Palette, ListChecks, FormInput, PartyPopper, Scale, Plus, Trash2, ExternalLink, RotateCcw, TrendingUp, Paintbrush, RefreshCw, Globe } from 'lucide-react'
import { MARKETING_URL } from '@/lib/constants'
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/locale-options'
import { cn } from '@/lib/utils'

const LANDING_PRESETS = [
  { name: 'Dark', bg: '#0A0A0A', text: '#FFFFFF', brand: '#7C3AED' },
  { name: 'Light', bg: '#FFFFFF', text: '#111827', brand: '#7C3AED' },
  { name: 'Ocean', bg: '#0C1A2E', text: '#E2EBF5', brand: '#3B82F6' },
  { name: 'Forest', bg: '#0A1A0F', text: '#E8F5EC', brand: '#22C55E' },
  { name: 'Rose', bg: '#1A0A0E', text: '#FFF1F3', brand: '#F43F5E' },
  { name: 'Amber', bg: '#1A1000', text: '#FFFBEB', brand: '#F59E0B' },
]
import { generateDefaultBenefits, BENEFIT_ICON_MAP, BENEFIT_ICON_OPTIONS } from '@/components/landing/value-stack'
import type { RewardsConfig } from '@/types/database'
import { migrateRewardsConfig } from '@/types/database'

type LandingPageSectionProps = {
  isAdmin: boolean
}

export function LandingPageSection({ isAdmin }: LandingPageSectionProps) {
  const { currentStudio } = useStudio()
  const { data: landingPages, isLoading } = useLandingPages()
  const updateLandingPage = useUpdateLandingPage()
  const createLandingPage = useCreateLandingPage()
  const { upload, uploading } = useImageUpload()

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_LANDING_SETTINGS)
  const [saving, setSaving] = useState(false)

  // The market currently being edited — the selected page, else the first/oldest.
  const landingPage = landingPages?.find((p) => p.id === selectedPageId) ?? landingPages?.[0] ?? null

  // Load data
  useEffect(() => {
    if (landingPage) {
      setHeadline(landingPage.headline ?? '')
      setDescription(landingPage.description ?? '')
      const s = landingPage.settings as LandingPageSettings | null
      const generatedTermsUrl = `${MARKETING_URL}/join/${landingPage.slug}/terms`
      if (s) setSettings({ ...DEFAULT_LANDING_SETTINGS, ...s, termsUrl: s.termsUrl || generatedTermsUrl })
      else setSettings({ ...DEFAULT_LANDING_SETTINGS, termsUrl: generatedTermsUrl })
    }
  }, [landingPage?.id])

  const studioSettings = (currentStudio?.settings ?? {}) as Record<string, unknown>
  const rewardsConfig = migrateRewardsConfig(studioSettings.rewards_config) as RewardsConfig
  const currency = settings.currency ?? (studioSettings.currency as string) ?? 'dkk'

  const updateSetting = (key: keyof LandingPageSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogoUpload = async (file: File) => {
    const url = await upload(file, 'landing_logo.png')
    if (url) updateSetting('logoUrl', url)
  }

  const handleSave = async () => {
    if (!landingPage) return
    setSaving(true)
    try {
      await updateLandingPage.mutateAsync({
        id: landingPage.id,
        headline,
        description,
        settings: settings as unknown as Record<string, unknown>,
        hero_image_url: settings.logoUrl,
      })
      toast.success('Landing page saved')
    } catch {
      toast.error('Failed to save landing page')
    } finally {
      setSaving(false)
    }
  }

  // Add a new market: a fresh landing page seeded with the studio's currency/language.
  // The operator then sets this market's currency, language and content, and saves.
  const handleAddMarket = async () => {
    try {
      const page = await createLandingPage.mutateAsync({
        currency: (studioSettings.currency as string) ?? 'dkk',
        language: (studioSettings.language as string) ?? 'en',
      })
      setSelectedPageId(page.id)
      toast.success('Market added — set its currency, language and content, then save')
    } catch {
      toast.error('Failed to add market')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-64 animate-shimmer rounded-xl" />
      </div>
    )
  }

  if (!landingPage) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Landing Page</h2>
        <p className="text-sm text-muted-foreground">No landing page found. Complete the setup wizard first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Landing Page</h2>
          <p className="text-sm text-muted-foreground">Customize your public signup page.</p>
        </div>
        <a
          href={`${MARKETING_URL}/join/${landingPage.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View live page
        </a>
      </div>

      {/* Markets: pills appear once there's more than one. Adding a second market
          is what turns on multi-market — single-market studios just see the button. */}
      <div className="flex flex-wrap items-center gap-2">
        {landingPages && landingPages.length > 1 && landingPages.map((p) => {
          const ps = (p.settings ?? {}) as LandingPageSettings
          const cur = (ps.currency ?? (studioSettings.currency as string) ?? 'dkk').toUpperCase()
          const lang = (ps.language ?? (studioSettings.language as string) ?? 'en').toUpperCase()
          const active = p.id === landingPage?.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPageId(p.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <Globe className="h-3 w-3" />
              {cur} · {lang}
              <span className="opacity-50">/{p.slug}</span>
            </button>
          )
        })}
        <Button variant="outline" size="sm" onClick={handleAddMarket} disabled={createLandingPage.isPending}>
          <Plus className="h-3.5 w-3.5" />
          {createLandingPage.isPending ? 'Adding…' : 'Add market'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Editor */}
        <div className="space-y-6">
          {/* Market: currency + language for this page */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Market
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                The currency and language for this page. Anyone who signs up here gets a
                loyalty card in this currency and language — and keeps it for life.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="market-currency">Currency</Label>
                  <Select
                    value={settings.currency ?? (studioSettings.currency as string) ?? 'dkk'}
                    onValueChange={(value) => updateSetting('currency', value)}
                  >
                    <SelectTrigger id="market-currency" className="w-full">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="market-language">Language</Label>
                  <Select
                    value={settings.language ?? (studioSettings.language as string) ?? 'en'}
                    onValueChange={(value) => updateSetting('language', value)}
                  >
                    <SelectTrigger id="market-language" className="w-full">
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Welcome to Studio Name"
                  disabled={!isAdmin}
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
                  disabled={!isAdmin}
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
            </CardContent>
          </Card>

          {/* Branding */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        disabled={!isAdmin}
                        onClick={() => {
                          updateSetting('backgroundColor', preset.bg)
                          updateSetting('textColor', preset.text)
                          updateSetting('brandColor', preset.brand)
                        }}
                        className={cn(
                          'group flex flex-col items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
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
                      disabled={!isAdmin}
                    />
                    <Input
                      value={settings.brandColor}
                      onChange={(e) => updateSetting('brandColor', e.target.value)}
                      className="font-mono text-xs"
                      disabled={!isAdmin}
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
                      disabled={!isAdmin}
                    />
                    <Input
                      value={settings.backgroundColor}
                      onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                      className="font-mono text-xs"
                      disabled={!isAdmin}
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
                      disabled={!isAdmin}
                    />
                    <Input
                      value={settings.textColor}
                      onChange={(e) => updateSetting('textColor', e.target.value)}
                      className="font-mono text-xs"
                      disabled={!isAdmin}
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
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* What You Get */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                What You Get
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const currentBenefits = settings.benefits ?? generateDefaultBenefits(rewardsConfig, currency)
                const generatedBenefits = generateDefaultBenefits(rewardsConfig, currency)
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
                  <>
                    {isOutOfSync && (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Cashback rates have changed — benefits are out of sync.
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:bg-amber-500/10"
                          onClick={syncRates}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Sync rates
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Benefits shown on your signup page. Edit text, reorder, or add your own.
                      </p>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground"
                          onClick={() => updateSetting('benefits', generateDefaultBenefits(rewardsConfig, currency))}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {currentBenefits.map((benefit, index) => (
                        <div key={benefit.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/30 p-3">
                          <Select
                            value={benefit.icon}
                            disabled={!isAdmin}
                            onValueChange={(val) => {
                              const updated = [...currentBenefits]
                              updated[index] = { ...benefit, icon: val }
                              updateSetting('benefits', updated)
                            }}
                          >
                            <SelectTrigger className="h-8 w-14 shrink-0 px-2">
                              <SelectValue>
                                {(() => {
                                  const Icon = BENEFIT_ICON_MAP[benefit.icon]
                                  return Icon ? <Icon className="h-4 w-4" /> : null
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {BENEFIT_ICON_OPTIONS.map((key) => {
                                const Icon = BENEFIT_ICON_MAP[key]
                                return (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
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
                            className="h-8 text-sm flex-1"
                            disabled={!isAdmin}
                          />
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              onClick={() => {
                                const updated = currentBenefits.filter((_, i) => i !== index)
                                updateSetting('benefits', updated)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs w-full"
                        onClick={() => {
                          const newBenefit: Benefit = {
                            id: `b_${Date.now()}`,
                            text: '',
                            icon: 'star',
                          }
                          updateSetting('benefits', [...currentBenefits, newBenefit])
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Benefit
                      </Button>
                    )}
                  </>
                )
              })()}
            </CardContent>
          </Card>

          {/* Cashback Journey */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cashback Journey
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Show tier progression</p>
                  <p className="text-xs text-muted-foreground">Display the cashback tiers on your signup page</p>
                </div>
                <Switch
                  checked={settings.showTierProgression ?? true}
                  onCheckedChange={(checked) => updateSetting('showTierProgression', checked)}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FormInput className="h-4 w-4" />
                Form Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Full name is always collected. Choose which additional fields to show.</p>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    size="sm"
                    checked={settings.showEmail}
                    onCheckedChange={(checked) => updateSetting('showEmail', checked)}
                    disabled={!isAdmin}
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    size="sm"
                    checked={settings.showPhone}
                    onCheckedChange={(checked) => updateSetting('showPhone', checked)}
                    disabled={!isAdmin}
                  />
                  Phone
                </label>
              </div>

              {/* Custom Fields */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Custom Fields</Label>
                  {isAdmin && (
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
                  )}
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
                        disabled={!isAdmin}
                      />
                      <div className="flex items-center gap-3">
                        <Select
                          value={field.type}
                          disabled={!isAdmin}
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
                            disabled={!isAdmin}
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
                                disabled={!isAdmin}
                              />
                              {isAdmin && (
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
                              )}
                            </div>
                          ))}
                          {isAdmin && (
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
                          )}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
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
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* After Signup */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PartyPopper className="h-4 w-4" />
                After Signup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Success Heading</Label>
                <Input
                  value={settings.successHeading ?? ''}
                  onChange={(e) => updateSetting('successHeading', e.target.value)}
                  placeholder="You're in!"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Success Message</Label>
                <Input
                  value={settings.successMessage ?? ''}
                  onChange={(e) => updateSetting('successMessage', e.target.value)}
                  placeholder="Welcome, {name}. Your loyalty card is ready."
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">Use {'{name}'} to insert the customer&apos;s name</p>
              </div>
            </CardContent>
          </Card>

          {/* Legal */}
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Terms & Privacy URL</Label>
                <Input
                  type="url"
                  value={settings.termsUrl ?? ''}
                  onChange={(e) => updateSetting('termsUrl', e.target.value)}
                  placeholder="https://yourstudio.com/terms"
                  disabled={!isAdmin}
                />
                {landingPage && settings.termsUrl === `${MARKETING_URL}/join/${landingPage.slug}/terms` ? (
                  <p className="text-xs text-muted-foreground">
                    Using your <a href={settings.termsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">auto-generated terms page</a> — replace with your own URL if you have one.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Shown as a link below the signup button</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} variant="glow">
                {saving ? 'Saving...' : 'Save Landing Page'}
              </Button>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6 lg:self-start">
          <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            Preview
          </label>
          <LandingPagePreview
            headline={headline}
            description={description}
            settings={settings}
            rewardsConfig={rewardsConfig}
            currency={currency}
          />
        </div>
      </div>
    </div>
  )
}

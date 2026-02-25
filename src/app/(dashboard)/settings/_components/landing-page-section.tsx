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
import { useLandingPage, useUpdateLandingPage, DEFAULT_LANDING_SETTINGS } from '@/hooks/use-landing-page'
import type { LandingPageSettings, CustomField, Benefit } from '@/hooks/use-landing-page'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useStudio } from '@/hooks/use-studio'
import { toast } from 'sonner'
import { FileText, Palette, ListChecks, FormInput, PartyPopper, Scale, Plus, Trash2, ExternalLink, RotateCcw, TrendingUp } from 'lucide-react'
import { APP_URL } from '@/lib/constants'
import { generateDefaultBenefits, BENEFIT_ICON_MAP, BENEFIT_ICON_OPTIONS } from '@/components/landing/value-stack'
import type { RewardsConfig } from '@/types/database'
import { migrateRewardsConfig } from '@/types/database'

type LandingPageSectionProps = {
  isAdmin: boolean
}

export function LandingPageSection({ isAdmin }: LandingPageSectionProps) {
  const { currentStudio } = useStudio()
  const { data: landingPage, isLoading } = useLandingPage()
  const updateLandingPage = useUpdateLandingPage()
  const { upload, uploading } = useImageUpload()

  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_LANDING_SETTINGS)
  const [saving, setSaving] = useState(false)

  // Load data
  useEffect(() => {
    if (landingPage) {
      setHeadline(landingPage.headline ?? '')
      setDescription(landingPage.description ?? '')
      const s = landingPage.settings as LandingPageSettings | null
      if (s) setSettings({ ...DEFAULT_LANDING_SETTINGS, ...s })
    }
  }, [landingPage?.id])

  const studioSettings = (currentStudio?.settings ?? {}) as Record<string, unknown>
  const rewardsConfig = migrateRewardsConfig(studioSettings.rewards_config) as RewardsConfig
  const currency = (studioSettings.currency as string) ?? 'dkk'

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
          href={`${APP_URL}/join/${landingPage.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View live page
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Editor */}
        <div className="space-y-6">
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
                return (
                  <>
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
                <p className="text-xs text-muted-foreground">Shown as a link below the signup button</p>
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

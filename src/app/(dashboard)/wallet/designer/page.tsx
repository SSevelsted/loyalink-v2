'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePassTemplates, useUpdatePassTemplate, useEnsureDefaultTemplate } from '@/hooks/use-wallet'
import { useRewardsConfig } from '@/hooks/use-rewards'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useStudio } from '@/hooks/use-studio'
import { CardPreview } from '@/components/wallet/card-preview'
import { TierList } from '@/components/wallet/tier-list'
import { TierEditor } from '@/components/wallet/tier-editor'
import { ImageUpload } from '@/components/wallet/image-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { TierTheme, CardField } from '@/types/database'
import { DEFAULT_TIER_THEMES, DEFAULT_CARD_FIELDS, DEFAULT_REWARDS_CONFIG } from '@/types/database'
import { isNative } from '@/lib/platform'
import { Monitor } from 'lucide-react'

const FIRST_TIER_SLUG = DEFAULT_REWARDS_CONFIG.tiers[0].slug

export default function DesignerPage() {
  const { currentStudio } = useStudio()

  // Wallet designer requires a wide screen — not usable on mobile native
  if (isNative()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
          <Monitor className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Use desktop for the card designer</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          The wallet card designer needs a wider screen. Open Loyalink on your computer to edit your card design.
        </p>
      </div>
    )
  }
  const { data: templates, isLoading } = usePassTemplates()
  const { data: rewardsConfig } = useRewardsConfig()
  const updateTemplate = useUpdatePassTemplate()
  const ensureTemplate = useEnsureDefaultTemplate()
  const { upload, uploading } = useImageUpload()

  const [selectedTier, setSelectedTier] = useState(FIRST_TIER_SLUG)
  const [tierThemes, setTierThemes] = useState<Record<string, TierTheme>>(DEFAULT_TIER_THEMES)
  const [cardFields, setCardFields] = useState<CardField[]>(DEFAULT_CARD_FIELDS)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const template = templates?.[0]

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
      const loadedThemes = template.tier_themes as Record<string, TierTheme> | undefined
      const firstTheme = loadedThemes ? loadedThemes[Object.keys(loadedThemes)[0]] : undefined
      setStripUrl(firstTheme?.stripImage ?? null)
    }
  }, [template?.id])

  // Sync sortOrder from rewards config tier order
  useEffect(() => {
    if (!rewardsConfig?.tiers?.length) return
    setTierThemes((prev) => {
      const next = { ...prev }
      let changed = false
      for (let i = 0; i < rewardsConfig.tiers.length; i++) {
        const slug = rewardsConfig.tiers[i].slug
        if (next[slug] && next[slug].sortOrder !== i) {
          next[slug] = { ...next[slug], sortOrder: i }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [rewardsConfig?.tiers])

  const handleTierChange = useCallback(
    (updates: Partial<TierTheme>) => {
      setTierThemes((prev) => ({
        ...prev,
        [selectedTier]: { ...prev[selectedTier], ...updates },
      }))
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
        cashbackRate: 0,
        minSpend: 0,
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

  const handleSave = async () => {
    if (!template) return
    try {
      // Apply the shared strip image to all tier themes before saving
      const themesWithStrip = Object.fromEntries(
        Object.entries(tierThemes).map(([key, theme]) => [key, { ...theme, stripImage: stripUrl }])
      )
      await updateTemplate.mutateAsync({
        id: template.id,
        tier_themes: themesWithStrip as unknown as Record<string, unknown>,
        card_fields: cardFields as unknown[],
        logo_url: logoUrl,
      })
      setDirty(false)
      toast.success('Card design saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-96 animate-shimmer rounded-xl" />
      </div>
    )
  }

  const currentTier = tierThemes[selectedTier]
    ?? Object.values(tierThemes)[0]
    ?? DEFAULT_TIER_THEMES[DEFAULT_REWARDS_CONFIG.tiers[0].slug]

  const defaultSlugs = [...DEFAULT_REWARDS_CONFIG.tiers.map(t => t.slug), 'base', 'loyalty_club', 'referral_1', 'referral_2', 'referral_3', 'inner_circle']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/wallet">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1
              className="text-display-lg text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Card Designer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customize wallet card appearance for each tier
            </p>
          </div>
        </div>
        <Button
          variant="glow"
          onClick={handleSave}
          disabled={!dirty || updateTemplate.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateTemplate.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Image uploads */}
      <Card variant="glass" className="rounded-2xl">
        <CardContent className="pt-0">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
            Brand Images
          </label>
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload
              label="Logo (all cards)"
              hint="PNG, 480x150 px (wide)"
              aspect={480 / 150}
              targetWidth={480}
              targetHeight={150}
              currentUrl={logoUrl}
              onUpload={handleLogoUpload}
              onRemove={() => {
                setLogoUrl(null)
                setDirty(true)
              }}
              uploading={uploading}
              removeBgType="graphic"
            />
            <ImageUpload
              label="Strip / Center Image"
              hint="PNG, 1125x432 px (wide banner)"
              aspect={1125 / 432}
              targetWidth={1125}
              targetHeight={432}
              currentUrl={stripUrl}
              onUpload={handleStripUpload}
              onRemove={() => {
                setStripUrl(null)
                setDirty(true)
              }}
              uploading={uploading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main editor layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_340px] gap-6">
        {/* Tier list */}
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

        {/* Tier editor */}
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="pt-0">
            <TierEditor
              slug={selectedTier}
              tier={currentTier}
              onChange={handleTierChange}
              onDelete={handleDeleteTier}
              canDelete={!defaultSlugs.includes(selectedTier)}
              logoOverride={currentTier.logoOverride ?? null}
              onLogoOverrideUpload={async (file: File) => {
                const url = await upload(file, `logo-${selectedTier}.png`)
                if (url) {
                  handleTierChange({ logoOverride: url })
                }
              }}
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
          />
        </div>
      </div>
    </div>
  )
}

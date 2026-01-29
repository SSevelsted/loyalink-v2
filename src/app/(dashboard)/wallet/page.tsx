'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePassTemplates, useUpdatePassTemplate, useEnsureDefaultTemplate, usePushLogs, useSendPush } from '@/hooks/use-wallet'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useStudio } from '@/hooks/use-studio'
import { CardPreview } from '@/components/wallet/card-preview'
import { TierList } from '@/components/wallet/tier-list'
import { TierEditor } from '@/components/wallet/tier-editor'
import { ImageUpload } from '@/components/wallet/image-upload'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Save, Send, Zap, Link, Copy, Check, Eye, QrCode, Code } from 'lucide-react'
import { toast } from 'sonner'
import type { TierTheme, CardField } from '@/types/database'
import { DEFAULT_TIER_THEMES, DEFAULT_CARD_FIELDS } from '@/types/database'
import { useLandingPage, useUpdateLandingPage, useEnsureLandingPage, DEFAULT_LANDING_SETTINGS } from '@/hooks/use-landing-page'
import type { LandingPageSettings } from '@/hooks/use-landing-page'
import { LandingPagePreview } from '@/components/landing/landing-page-preview'
import { EmbedCode } from '@/components/landing/embed-code'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_URL } from '@/lib/constants'

const DEFAULT_SLUGS = ['base', 'loyalty_club', 'referral_1', 'referral_2', 'referral_3', 'inner_circle']

export default function WalletPage() {
  const { currentStudio } = useStudio()
  const { data: templates, isLoading } = usePassTemplates()
  const updateTemplate = useUpdatePassTemplate()
  const ensureTemplate = useEnsureDefaultTemplate()
  const { data: pushLogs } = usePushLogs()
  const sendPush = useSendPush()
  const { upload, uploading } = useImageUpload()

  const [selectedTier, setSelectedTier] = useState('base')
  const [tierThemes, setTierThemes] = useState<Record<string, TierTheme>>(DEFAULT_TIER_THEMES)
  const [cardFields, setCardFields] = useState<CardField[]>(DEFAULT_CARD_FIELDS)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Landing page state
  const { data: landingPage, isLoading: lpLoading } = useLandingPage()
  const updateLandingPage = useUpdateLandingPage()
  const ensureLandingPage = useEnsureLandingPage()
  const [lpHeadline, setLpHeadline] = useState('')
  const [lpDescription, setLpDescription] = useState('')
  const [lpSettings, setLpSettings] = useState<LandingPageSettings>(DEFAULT_LANDING_SETTINGS)
  const [lpDirty, setLpDirty] = useState(false)

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
      setLpHeadline(landingPage.headline ?? '')
      setLpDescription(landingPage.description ?? '')
      const s = landingPage.settings as LandingPageSettings | null
      if (s) setLpSettings({ ...DEFAULT_LANDING_SETTINGS, ...s })
    }
  }, [landingPage?.id])

  const updateLpSetting = (key: keyof LandingPageSettings, value: unknown) => {
    setLpSettings((prev) => ({ ...prev, [key]: value }))
    setLpDirty(true)
  }

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
        settings: lpSettings as unknown as Record<string, unknown>,
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
    await navigator.clipboard.writeText(`${APP_URL}/join/${landingPage.slug}`)
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
        setTierThemes(themes)
      }
      const fields = template.card_fields as CardField[] | null
      if (fields && fields.length > 0) {
        setCardFields(fields)
      }
      setLogoUrl(template.logo_url)
      setIconUrl(template.icon_url)
      setStripUrl((template.tier_themes as Record<string, TierTheme>)?.base?.stripImage ?? null)
    }
  }, [template?.id])

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
    setSelectedTier('base')
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
    if (!template) return
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        tier_themes: tierThemes as unknown as Record<string, unknown>,
        card_fields: cardFields as unknown[],
        logo_url: logoUrl,
        icon_url: iconUrl,
      })
      setDirty(false)
      toast.success('Card design saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  const handlePushAll = async () => {
    await sendPush.mutateAsync({ targetType: 'all' })
    setPushOpen(false)
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
  if (!currentTier) return null

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
        <div className="flex items-center gap-2">
          <Button
            variant="glow"
            onClick={handleSave}
            disabled={!dirty || updateTemplate.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateTemplate.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Dialog open={pushOpen} onOpenChange={setPushOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Zap className="h-4 w-4" />
                Push
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Send Push Update
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <p className="text-sm text-foreground">
                    This sends a silent push to all registered devices, prompting them to refresh their pass data.
                  </p>
                </div>
                <Button onClick={handlePushAll} className="w-full" disabled={sendPush.isPending}>
                  {sendPush.isPending ? 'Sending...' : 'Send to All Devices'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="designer">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="designer">Card Designer</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
          <TabsTrigger value="logs">Push Logs</TabsTrigger>
        </TabsList>

        {/* ── Designer Tab ── */}
        <TabsContent value="designer" className="space-y-6 mt-4">
          {/* Bulk image uploads */}
          <Card variant="glass" className="rounded-2xl">
            <CardContent className="pt-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
                Default images (applied to all tiers)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImageUpload
                  label="Logo"
                  hint="PNG, 480×150 px (wide)"
                  aspect={480 / 150}
                  targetWidth={480}
                  targetHeight={150}
                  currentUrl={logoUrl}
                  onUpload={handleLogoUpload}
                  onRemove={() => { setLogoUrl(null); setDirty(true) }}
                  uploading={uploading}
                />
                <ImageUpload
                  label="Strip / Center Image"
                  hint="PNG, 1125×432 px (wide banner)"
                  aspect={1125 / 432}
                  targetWidth={1125}
                  targetHeight={432}
                  currentUrl={stripUrl}
                  onUpload={handleStripUpload}
                  onRemove={() => { setStripUrl(null); setDirty(true) }}
                  uploading={uploading}
                />
                <ImageUpload
                  label="Icon (Google & Notifications)"
                  hint="PNG, 512×512 px (1:1 square)"
                  aspect={1}
                  targetWidth={512}
                  targetHeight={512}
                  currentUrl={iconUrl}
                  onUpload={handleIconUpload}
                  onRemove={() => { setIconUrl(null); setDirty(true) }}
                  uploading={uploading}
                />
                <div />
              </div>
            </CardContent>
          </Card>

          {/* Main editor layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_380px] gap-6">
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
                  canDelete={!DEFAULT_SLUGS.includes(selectedTier)}
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
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Landing Page Tab ── */}
        <TabsContent value="landing" className="space-y-6 mt-4">
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
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lpSettings.showEmail} onChange={(e) => updateLpSetting('showEmail', e.target.checked)} className="rounded" />
                    Show Email Field
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lpSettings.showPhone} onChange={(e) => updateLpSetting('showPhone', e.target.checked)} className="rounded" />
                    Show Phone Field
                  </label>
                </div>

                {/* Share Section */}
                {landingPage && (
                  <div className="border-t border-border/30 pt-4 space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Link className="h-4 w-4" /> Share
                    </h3>
                    <div className="flex items-center gap-2">
                      <Input value={`${APP_URL}/join/${landingPage.slug}`} readOnly className="font-mono text-xs" />
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
            <div className="flex flex-col items-center gap-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview
              </label>
              <LandingPagePreview headline={lpHeadline} description={lpDescription} settings={lpSettings} />
            </div>
          </div>
        </TabsContent>

        {/* ── Push Logs Tab ── */}
        <TabsContent value="logs" className="space-y-2 mt-4">
          {!pushLogs?.length ? (
            <div className="py-20 text-center">
              <Send className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No push logs</p>
            </div>
          ) : (
            pushLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-xl border border-border/30 px-4 py-3 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Send className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {log.target_type} push
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {log.sent_count}/{log.total_devices}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      log.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : log.status === 'failed'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }
                  >
                    {log.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

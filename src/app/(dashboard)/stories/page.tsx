'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { useStudio } from '@/hooks/use-studio'
import { useImageUpload } from '@/hooks/use-image-upload'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sparkles,
  Download,
  Loader2,
  Copy,
  Check,
  X,
  ImagePlus,
  Upload,
  Pencil,
  RotateCcw,
} from 'lucide-react'
import { useLandingPage, type LandingPageSettings } from '@/hooks/use-landing-page'
import { APP_URL } from '@/lib/constants'
import { migrateRewardsConfig } from '@/types/database'
import {
  STORY_TYPES,
  DESIGN_STYLES,
  STORY_FIELD_DEFS,
  buildStoryHtml,
  getDefaultCopy,
  type BrandContext,
  type DesignStyle,
  type StoryCopyOverrides,
} from './templates'

const STORY_W = 1080
const STORY_H = 1920

// ─── Main page ────────────────────────────────────────────────────────────

export default function StoriesPage() {
  const { currentStudio } = useStudio()
  const { data: landingPage, isLoading: lpLoading } = useLandingPage()
  const { upload, uploading } = useImageUpload()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [activeDesign, setActiveDesign] = useState(DESIGN_STYLES[0].id)
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<StoryCopyOverrides>({})
  const [savedOverrides, setSavedOverrides] = useState<StoryCopyOverrides>({})

  const signupUrl = landingPage?.slug ? `${APP_URL}/join/${landingPage.slug}` : null
  const activeDesignDef = DESIGN_STYLES.find((d) => d.id === activeDesign)!
  const isPhotoDesign = activeDesignDef.usesBackgroundImage

  // Load saved overrides from studio settings
  useEffect(() => {
    if (!currentStudio) return
    const settings = (currentStudio.settings ?? {}) as Record<string, unknown>
    const stored = (settings.story_copy ?? {}) as StoryCopyOverrides
    setSavedOverrides(stored)
  }, [currentStudio])

  // Save mutation
  const saveCopy = useMutation({
    mutationFn: async (overrides: StoryCopyOverrides) => {
      const { error } = await supabase
        .from('studios')
        .update({
          settings: {
            ...(currentStudio?.settings ?? {}),
            story_copy: overrides,
          },
        })
        .eq('id', currentStudio!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] })
      toast.success('Story text saved')
      setEditingStoryId(null)
    },
    onError: () => toast.error('Failed to save'),
  })

  function openEditor(storyId: string) {
    setEditDraft({ ...savedOverrides })
    setEditingStoryId(storyId)
  }

  function handleSaveEdits() {
    saveCopy.mutate(editDraft)
    setSavedOverrides(editDraft)
  }

  function handleResetStory(storyId: string) {
    const fields = STORY_FIELD_DEFS[storyId]
    if (!fields) return
    const cleared = { ...editDraft }
    for (const f of fields) {
      if (f.key !== 'cta_text') delete cleared[f.key]
    }
    setEditDraft(cleared)
  }

  // The overrides to use for preview: when editing, use the draft; otherwise use saved
  const activeOverrides = editingStoryId ? editDraft : savedOverrides

  function copySignupUrl() {
    if (!signupUrl) return
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Build brand context
  const brand = useMemo<BrandContext | null>(() => {
    if (!currentStudio) return null

    const settings = (currentStudio.settings ?? {}) as Record<string, unknown>
    const rewardsConfig = settings?.rewards_config
      ? migrateRewardsConfig(settings.rewards_config)
      : null
    const currency = (settings.currency as string) ?? 'DKK'

    const tiers =
      rewardsConfig?.tiers.map((t, i) => ({
        name: t.name,
        cashbackRate: t.cashback_rate,
        isBase: i === 0,
      })) ?? [{ name: 'Loyalty', cashbackRate: 7.5, isBase: true }]

    const lpSettings = (landingPage?.settings ?? {}) as LandingPageSettings

    return {
      studioName: currentStudio.name ?? 'Studio',
      signupUrl: signupUrl ?? APP_URL,
      brandColor: lpSettings.brandColor ?? '#7C3AED',
      backgroundColor: lpSettings.backgroundColor ?? '#0A0A0A',
      textColor: lpSettings.textColor ?? '#FFFFFF',
      logoUrl: lpSettings.logoUrl ?? null,
      currency,
      language: (settings.language as string) ?? 'en',
      tiers,
      referralEnabled: rewardsConfig?.referrals?.enabled ?? false,
      referralBonusPerRef: rewardsConfig?.referrals?.referrer_cashback_bonus_per_ref ?? 0,
      referralCap: rewardsConfig?.referrals?.referrer_cashback_cap ?? 0,
      friendCashbackRate: rewardsConfig?.referrals?.friend_cashback_rate ?? 0,
      friendWelcomeBonus: rewardsConfig?.referrals?.friend_welcome_bonus ?? 0,
      benefits: lpSettings.benefits?.map((b) => b.text).filter(Boolean) ?? [],
      storyOverrides: activeOverrides,
    }
  }, [currentStudio, landingPage, signupUrl, activeOverrides])

  // Build 3 stories for the active design
  const stories = useMemo(() => {
    if (!brand) return []
    return STORY_TYPES.map((st) => ({
      storyType: st,
      html: buildStoryHtml(
        st.id,
        activeDesign,
        brand,
        isPhotoDesign ? bgImageUrl : undefined
      ),
      key: `${activeDesign}-${st.id}`,
    }))
  }, [brand, activeDesign, bgImageUrl, isPhotoDesign])

  // ── Photo upload ──────────────────────────────────────────────────────

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await upload(file, 'story-bg.jpg')
    if (url) {
      setBgImageUrl(url)
      toast.success('Background uploaded')
    } else {
      toast.error('Upload failed')
    }
    e.target.value = ''
  }

  function triggerFileInput() {
    fileInputRef.current?.click()
  }

  // ── Download ──────────────────────────────────────────────────────────

  async function renderToPng(html: string): Promise<string | null> {
    try {
      const res = await fetch('/api/ai/story/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      if (res.status === 503) return null
      if (!res.ok) return null
      const { imageUrl } = await res.json()
      return imageUrl as string
    } catch {
      return null
    }
  }

  function downloadAsHtml(html: string, slug: string) {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `story-${slug}-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadOne(key: string, html: string) {
    setDownloadingKey(key)
    try {
      const imageUrl = await renderToPng(html)
      if (imageUrl) {
        const a = document.createElement('a')
        a.href = imageUrl
        a.download = `story-${key}.png`
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
      } else {
        downloadAsHtml(html, key)
        toast.info('Downloaded as HTML — add HCTI credentials for PNG export')
      }
    } catch {
      downloadAsHtml(html, key)
    } finally {
      setDownloadingKey(null)
    }
  }

  async function handleDownloadAll() {
    if (stories.length === 0) return
    setDownloading(true)
    toast.info(`Preparing ${stories.length} stories…`)

    try {
      const results = await Promise.all(
        stories.map(async ({ key, html }) => {
          const imageUrl = await renderToPng(html)
          return { key, html, imageUrl }
        })
      )

      for (const { key, html, imageUrl } of results) {
        if (imageUrl) {
          const a = document.createElement('a')
          a.href = imageUrl
          a.download = `story-${key}.png`
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
          a.click()
        } else {
          downloadAsHtml(html, key)
        }
        await new Promise((r) => setTimeout(r, 400))
      }

      toast.success(`Downloaded ${results.length} stories`)
    } finally {
      setDownloading(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────

  if (!currentStudio || lpLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none">Stories</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Loading…</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const previewStory = previewKey ? stories.find((s) => s.key === previewKey) : null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none">Stories</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pick a design, download your set
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {signupUrl && (
            <button
              onClick={copySignupUrl}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy signup link'}
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Download all 3
          </Button>
        </div>
      </div>

      {/* Design tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] px-6 py-2 flex-shrink-0 overflow-x-auto">
        {DESIGN_STYLES.map((ds) => (
          <button
            key={ds.id}
            onClick={() => setActiveDesign(ds.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeDesign === ds.id
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {ds.usesBackgroundImage && <ImagePlus className="h-3.5 w-3.5" />}
            {ds.label}
          </button>
        ))}
        <span className="text-[11px] text-muted-foreground ml-2 hidden sm:inline">
          {activeDesignDef.subtitle}
        </span>
      </div>

      {/* Photo upload dropzone (only when Photo tab active) */}
      {isPhotoDesign && (
        <div className="flex-shrink-0 px-6 py-3 border-b border-white/[0.06]">
          {bgImageUrl ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg overflow-hidden border border-white/[0.08] flex-shrink-0">
                <img
                  src={bgImageUrl}
                  alt="Background"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-xs text-muted-foreground">Background uploaded</span>
              <button
                onClick={triggerFileInput}
                disabled={uploading}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
            </div>
          ) : (
            <button
              onClick={triggerFileInput}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.1] hover:border-primary/30 bg-secondary/20 hover:bg-secondary/30 transition-colors py-5"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? 'Uploading…' : 'Upload your background image (1080×1920 recommended)'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Story grid — 3 stories */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {stories.map(({ storyType, html, key }) => (
            <StoryCard
              key={key}
              storyType={storyType}
              html={html}
              storyKey={key}
              downloadingKey={downloadingKey}
              onPreview={() => setPreviewKey(key)}
              onDownload={() => handleDownloadOne(key, html)}
              onEdit={() => openEditor(storyType.id)}
            />
          ))}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Preview overlay */}
      {previewStory && (
        <PreviewOverlay
          label={previewStory.storyType.label}
          subtitle={previewStory.storyType.subtitle}
          html={previewStory.html}
          storyKey={previewStory.key}
          downloadingKey={downloadingKey}
          onClose={() => setPreviewKey(null)}
          onDownload={() => handleDownloadOne(previewStory.key, previewStory.html)}
        />
      )}

      {/* Edit sheet */}
      <Sheet open={!!editingStoryId} onOpenChange={(open) => !open && setEditingStoryId(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {editingStoryId && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Edit: {STORY_TYPES.find((s) => s.id === editingStoryId)?.label}
                </SheetTitle>
                <SheetDescription>
                  Use {'{baseRate}'}, {'{topRate}'}, {'{studioName}'} for dynamic values
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 py-4">
                {STORY_FIELD_DEFS[editingStoryId]?.map((field) => {
                  const baseRate = brand?.tiers[0]?.cashbackRate ?? 0
                  const topRate = brand?.tiers[brand.tiers.length - 1]?.cashbackRate ?? baseRate
                  const lang = brand?.language ?? 'en'
                  const defaultVal = getDefaultCopy(lang, field.key, baseRate, topRate)
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        value={editDraft[field.key] ?? ''}
                        placeholder={defaultVal}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                    </div>
                  )
                })}
              </div>
              <SheetFooter className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetStory(editingStoryId)}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset to defaults
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdits}
                  disabled={saveCopy.isPending}
                >
                  {saveCopy.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function AutoScaledIframe({ html, title }: { html: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.getBoundingClientRect().width / STORY_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        scrolling="no"
        title={title}
        style={{
          width: STORY_W,
          height: STORY_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function StoryCard({
  storyType,
  html,
  storyKey,
  downloadingKey,
  onPreview,
  onDownload,
  onEdit,
}: {
  storyType: (typeof STORY_TYPES)[number]
  html: string
  storyKey: string
  downloadingKey: string | null
  onPreview: () => void
  onDownload: () => void
  onEdit: () => void
}) {
  const isDownloading = downloadingKey === storyKey

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onPreview}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
        style={{ aspectRatio: '9/16' }}
      >
        <AutoScaledIframe html={html} title={storyType.label} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <span className="text-xs font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
            Preview
          </span>
        </div>
      </button>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium leading-none">{storyType.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{storyType.subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
            disabled={isDownloading}
            className="flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewOverlay({
  label,
  subtitle,
  html,
  storyKey,
  downloadingKey,
  onClose,
  onDownload,
}: {
  label: string
  subtitle: string
  html: string
  storyKey: string
  downloadingKey: string | null
  onClose: () => void
  onDownload: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const isDownloading = downloadingKey === storyKey

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setScale(Math.min(rect.width / STORY_W, rect.height / STORY_H))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6"
      onClick={handleClose}
    >
      <div
        className="flex flex-col items-center gap-4 max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium">{label}</p>
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          <div className="h-4 w-px bg-white/10" />
          <Button size="sm" variant="outline" onClick={onDownload} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Download
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black"
          style={{ width: '100%', maxWidth: 400, aspectRatio: '9/16' }}
        >
          <iframe
            srcDoc={html}
            sandbox="allow-scripts"
            scrolling="no"
            title={label}
            style={{
              width: STORY_W,
              height: STORY_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              border: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">1080 × 1920 px</p>
      </div>
    </div>
  )
}

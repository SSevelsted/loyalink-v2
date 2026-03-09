'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useStudio } from '@/hooks/use-studio'
import { toast } from 'sonner'
import {
  Sparkles,
  Download,
  ArrowLeft,
  Send,
  Loader2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import { useLandingPage } from '@/hooks/use-landing-page'
import { APP_URL } from '@/lib/constants'

// ─── Types ──────────────────────────────────────────────────────────────────

const MAX_TURNS = 3

// Preview size: 216×384 = 1080×1920 scaled to 20%
const PREVIEW_W = 216
const PREVIEW_H = 384
const STORY_W = 1080
const STORY_H = 1920
const SCALE = PREVIEW_W / STORY_W

type StoryMessage = {
  role: 'user' | 'assistant'
  content: string // for assistant, this is the raw HTML
}

type Draft = {
  label: string
  subtitle: string
  html: string
}

type DraftSlot = Draft | 'loading' | 'error'

// ─── Draft themes ─────────────────────────────────────────────────────────

const DRAFT_THEMES = [
  {
    label: 'The Reward',
    subtitle: 'Lead with cashback',
    prompt:
      'HERO ZONE brief: Make the cashback percentage the undeniable hero. Display it in massive (150px+) bold type — glowing, centred, with a soft circular glow behind it in the brand color. Below the number: "cashback on every visit" in a large sub-headline. Below that: one short punchy line like "Earn every time. Automatically." in body text. EMOTION: Free money, every single visit — pure FOMO. Premium, exciting, unmissable. Remember: logo zone, trust row, and CTA bar are handled by the Series Design Rules — do NOT duplicate them inside the hero zone.',
  },
  {
    label: 'Level Up',
    subtitle: 'Show the tier journey',
    prompt:
      'HERO ZONE brief: Show all loyalty tiers as a vertical progression stack, centred. Each tier is a card/row with its name and cashback %. The base tier is labelled "You start here →" subtly. Each higher tier is progressively brighter and more vivid in the brand color — the top tier blazes brightest with a strong glow. A connecting progress line runs through them. Headline above the stack: "The more you visit, the more you earn." EMOTION: Aspiration and momentum — top rewards feel visible and achievable. Remember: logo zone, trust row, and CTA bar are handled by the Series Design Rules — do NOT duplicate them inside the hero zone.',
  },
  {
    label: '30 Seconds',
    subtitle: 'Zero friction signup',
    prompt:
      'HERO ZONE brief: Remove every last barrier. Big confident headline: "Join in 30 seconds." Three large numbered steps, centred vertically, each in a branded card: 1 "Tap the link" · 2 "Enter your name" · 3 "Earn cashback today." Below the steps in softer body text: "No app. No card. No commitment." Then a single highlight line in the brand color: "Earn [base cashback rate]% from your very first visit." EMOTION: Impossibly easy — for the person who keeps meaning to sign up. Remember: logo zone, trust row, and CTA bar are handled by the Series Design Rules — do NOT duplicate them inside the hero zone.',
  },
]

// ─── Cache helpers ─────────────────────────────────────────────────────────

const CACHE_VERSION = 'v2'

function cacheKey(studioId: string) {
  return `loyalink_stories_${CACHE_VERSION}_${studioId}`
}

function loadCachedStories(studioId: string): Draft[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(studioId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    // Expire after 7 days
    return parsed
  } catch {
    return null
  }
}

function saveCachedStories(studioId: string, drafts: Draft[]) {
  try {
    localStorage.setItem(cacheKey(studioId), JSON.stringify(drafts))
  } catch {
    // localStorage quota exceeded — ignore
  }
}

function clearCachedStories(studioId: string) {
  try {
    localStorage.removeItem(cacheKey(studioId))
  } catch {
    // ignore
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Scale-down iframe preview of a 1080×1920 HTML story */
function StoryPreview({ html, className = '' }: { html: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-xl bg-black ${className}`}
      style={{ width: PREVIEW_W, height: PREVIEW_H }}
    >
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        scrolling="no"
        title="Story preview"
        style={{
          width: STORY_W,
          height: STORY_H,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          border: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function StoriesPage() {
  const { currentStudio } = useStudio()
  const { data: landingPage } = useLandingPage()
  const [copied, setCopied] = useState(false)

  const signupUrl = landingPage?.slug ? `${APP_URL}/join/${landingPage.slug}` : null

  function copySignupUrl() {
    if (!signupUrl) return
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const [phase, setPhase] = useState<'generating' | 'drafts' | 'refining'>('generating')
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>(DRAFT_THEMES.map(() => 'loading'))
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [messages, setMessages] = useState<StoryMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [refineLoading, setRefineLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  // The latest HTML is always the last assistant message's content
  const currentHtml =
    [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? null

  // Refinements = assistant turns after the initial draft (index 0)
  const refinementTurns = messages.filter((m) => m.role === 'assistant').length - 1
  const turnsLeft = MAX_TURNS - Math.max(0, refinementTurns)
  const canSend = !refineLoading && prompt.trim().length > 0 && turnsLeft > 0

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Auto-init: load from cache or generate on first studio load ───────
  useEffect(() => {
    if (!currentStudio || hasInitialized.current) return
    hasInitialized.current = true

    const cached = loadCachedStories(currentStudio.id)
    if (cached) {
      setDraftSlots(cached)
      setPhase('drafts')
    } else {
      handleGenerateDrafts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStudio])

  // ── Generate a single draft ───────────────────────────────────────────

  async function generateSingleDraft(theme: (typeof DRAFT_THEMES)[number], index: number) {
    if (!currentStudio) return
    try {
      const res = await fetch('/api/ai/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: currentStudio.id,
          messages: [{ role: 'user', content: theme.prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      const { html } = await res.json()
      setDraftSlots((prev) => {
        const next = [...prev]
        next[index] = { label: theme.label, subtitle: theme.subtitle, html }
        return next
      })
    } catch (err) {
      console.error(`[draft ${index}] error:`, err)
      setDraftSlots((prev) => {
        const next = [...prev]
        next[index] = 'error'
        return next
      })
    }
  }

  async function handleGenerateDrafts(opts?: { clearCache?: boolean }) {
    if (!currentStudio) return
    if (opts?.clearCache) clearCachedStories(currentStudio.id)
    setPhase('generating')
    setDraftSlots(DRAFT_THEMES.map(() => 'loading'))

    await Promise.allSettled(DRAFT_THEMES.map((theme, i) => generateSingleDraft(theme, i)))

    setPhase('drafts')

    // Save to cache only if all drafts succeeded
    setDraftSlots((current) => {
      const allSucceeded = current.every((s): s is Draft => s !== 'loading' && s !== 'error')
      if (allSucceeded) saveCachedStories(currentStudio.id, current as Draft[])
      return current
    })
  }

  // ── Select a draft → enter refine phase ──────────────────────────────

  function handleSelectDraft(draft: Draft) {
    setSelectedDraft(draft)
    setMessages([{ role: 'assistant', content: draft.html }])
    setPhase('refining')
  }

  // ── Refine the selected story ─────────────────────────────────────────

  async function handleRefine() {
    if (!canSend || !currentStudio) return

    const userMessage: StoryMessage = { role: 'user', content: prompt.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setPrompt('')
    setRefineLoading(true)

    try {
      const res = await fetch('/api/ai/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: currentStudio.id,
          messages: updatedMessages,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      const { html } = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: html }])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refine story')
      setMessages(messages)
    } finally {
      setRefineLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRefine()
    }
  }

  // ── Download ──────────────────────────────────────────────────────────

  async function handleDownload() {
    if (!currentHtml) return
    setDownloading(true)

    try {
      const res = await fetch('/api/ai/story/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: currentHtml }),
      })

      if (res.status === 503) {
        downloadAsHtml(currentHtml, 'refined')
        toast.info('Tip: add HCTI credentials to download as PNG')
        return
      }

      if (!res.ok) throw new Error('Render failed')

      const { imageUrl } = await res.json()
      const a = document.createElement('a')
      a.href = imageUrl
      a.download = `story-${Date.now()}.png`
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.click()
    } catch {
      downloadAsHtml(currentHtml, 'refined')
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadAll() {
    const successfulDrafts = draftSlots.filter(
      (s): s is Draft => s !== 'loading' && s !== 'error'
    )
    if (successfulDrafts.length === 0) return

    setDownloadingAll(true)
    toast.info(`Preparing ${successfulDrafts.length} stories…`)

    try {
      // Render all in parallel
      const results = await Promise.all(
        successfulDrafts.map(async (draft, i) => {
          try {
            const res = await fetch('/api/ai/story/render', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ html: draft.html }),
            })
            if (res.status === 503) return { draft, imageUrl: null }
            if (!res.ok) return { draft, imageUrl: null }
            const { imageUrl } = await res.json()
            return { draft, imageUrl: imageUrl as string }
          } catch {
            return { draft, imageUrl: null, index: i }
          }
        })
      )

      // Download sequentially with a small gap so the browser doesn't block them
      for (const { draft, imageUrl } of results) {
        const slug = draft.label.toLowerCase().replace(/\s+/g, '-')
        if (imageUrl) {
          const a = document.createElement('a')
          a.href = imageUrl
          a.download = `story-${slug}.png`
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
          a.click()
        } else {
          downloadAsHtml(draft.html, slug)
        }
        await new Promise((r) => setTimeout(r, 400))
      }

      toast.success(`Downloaded ${results.length} stories`)
    } finally {
      setDownloadingAll(false)
    }
  }

  function downloadAsHtml(html: string, slug = 'story') {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `story-${slug}-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleBackToDrafts() {
    setPhase('drafts')
    setSelectedDraft(null)
    setMessages([])
    setPrompt('')
  }

  // ── Phases ────────────────────────────────────────────────────────────

  if (phase === 'generating' || phase === 'drafts') {
    const allDone = draftSlots.every((s) => s !== 'loading')
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">AI Stories</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {allDone ? 'Pick a draft to refine' : 'Generating your stories…'}
              </p>
            </div>
          </div>
          {allDone && (
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
                disabled={downloadingAll}
              >
                {downloadingAll ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                Download all
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleGenerateDrafts({ clearCache: true })}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {DRAFT_THEMES.map((theme, i) => {
              const slot = draftSlots[i]
              return (
                <DraftCard
                  key={theme.label}
                  theme={theme}
                  slot={slot}
                  onSelect={() => {
                    if (slot && slot !== 'loading' && slot !== 'error') {
                      handleSelectDraft(slot)
                    }
                  }}
                  onRetry={() => {
                    setDraftSlots((prev) => {
                      const next = [...prev]
                      next[i] = 'loading'
                      return next
                    })
                    generateSingleDraft(theme, i)
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Refine phase ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDrafts}
            className="h-8 px-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Drafts
          </Button>
          <div className="h-4 w-px bg-white/[0.1]" />
          <div>
            <p className="text-sm font-medium leading-none">{selectedDraft?.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{selectedDraft?.subtitle}</p>
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
          {currentHtml && (
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Download
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: live preview */}
        <div className="hidden md:flex w-72 flex-shrink-0 flex-col items-center justify-center border-r border-white/[0.06] bg-secondary/10 p-6 gap-3">
          {currentHtml ? (
            <>
              {refineLoading ? (
                <div className="relative">
                  <StoryPreview html={currentHtml} />
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                </div>
              ) : (
                <StoryPreview html={currentHtml} />
              )}
              <p className="text-[11px] text-muted-foreground">1080 × 1920 px</p>
            </>
          ) : (
            <Skeleton className="rounded-2xl" style={{ width: PREVIEW_W, height: PREVIEW_H }} />
          )}
        </div>

        {/* Right: chat panel */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Mobile: show current preview */}
            {currentHtml && (
              <div className="md:hidden flex justify-center py-2">
                <StoryPreview html={currentHtml} />
              </div>
            )}

            {/* Refinement conversation (skip the first assistant message = initial draft) */}
            {messages.slice(1).map((msg, i) => (
              <RefinementBubble key={i} message={msg} />
            ))}

            {refineLoading && <ThinkingBubble />}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.06] p-4 space-y-2 flex-shrink-0">
            {turnsLeft === 0 && !refineLoading ? (
              <div className="rounded-lg bg-muted/50 border border-white/[0.06] p-3 text-center text-sm text-muted-foreground">
                Max refinements reached.{' '}
                <button
                  className="text-primary underline underline-offset-2"
                  onClick={handleBackToDrafts}
                >
                  Go back to drafts
                </button>
              </div>
            ) : (
              <>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={'What would you like to change? e.g. "Make the text bigger" or "Use a darker background"'}
                  className="min-h-[80px] resize-none text-sm bg-secondary/50 border-white/[0.08] focus-visible:ring-primary/30"
                  disabled={refineLoading}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {refinementTurns > 0
                      ? `${turnsLeft} refinement${turnsLeft !== 1 ? 's' : ''} left`
                      : 'Describe any changes · Enter to send'}
                  </span>
                  <Button size="sm" onClick={handleRefine} disabled={!canSend}>
                    {refineLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">Refine</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

/** Iframe that auto-scales to fill its container width (ResizeObserver-based) */
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

function DraftCard({
  theme,
  slot,
  onSelect,
  onRetry,
}: {
  theme: (typeof DRAFT_THEMES)[number]
  slot: DraftSlot
  onSelect: () => void
  onRetry: () => void
}) {
  const isLoading = slot === 'loading'
  const isError = slot === 'error'
  const draft = !isLoading && !isError ? (slot as Draft) : null

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onSelect}
        disabled={isLoading || isError}
        className={`relative overflow-hidden rounded-2xl border transition-all duration-200 group ${
          draft
            ? 'border-white/[0.08] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer'
            : 'border-white/[0.06] cursor-default'
        }`}
        style={{ aspectRatio: '9/16' }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-secondary/40 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">Generating…</p>
          </div>
        )}
        {isError && (
          <div className="absolute inset-0 bg-secondary/40 flex flex-col items-center justify-center gap-2 p-4">
            <p className="text-[11px] text-muted-foreground text-center">Failed to generate</p>
            <button
              onClick={(e) => { e.stopPropagation(); onRetry() }}
              className="text-[11px] text-primary underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}
        {draft && (
          <>
            <AutoScaledIframe html={draft.html} title={draft.label} />
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
              <span className="text-xs font-semibold text-white bg-primary rounded-full px-4 py-1.5 shadow-lg">
                Select
              </span>
            </div>
          </>
        )}
      </button>
      <div>
        <p className="text-xs font-medium leading-none">{theme.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{theme.subtitle}</p>
      </div>
    </div>
  )
}

function RefinementBubble({ message }: { message: StoryMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5">
          <p className="text-sm text-primary-foreground leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="space-y-1.5">
        <StoryPreview html={message.content} />
        <p className="text-[11px] text-muted-foreground pl-1">Story updated</p>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-tl-sm bg-secondary/70 border border-white/[0.06] px-3.5 py-2.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    </div>
  )
}

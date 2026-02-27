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
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

const MAX_TURNS = 4

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
    label: 'Program overview',
    subtitle: 'What is it?',
    prompt:
      'Create an Instagram Story that introduces the loyalty program. Show the tier structure visually — list all tiers with their names and cashback percentages. Make it clear that members move up tiers as they engage more. Use the actual tier names and rates from the brand context.',
  },
  {
    label: 'How you earn',
    subtitle: 'Cashback breakdown',
    prompt:
      'Create an Instagram Story that explains exactly how customers earn cashback. Show the base tier cashback rate prominently in the correct currency. Visualise the step-by-step: visit → scan → cashback added automatically. Reference the "how it works" copy if relevant.',
  },
  {
    label: 'Tier benefits',
    subtitle: 'Level up rewards',
    prompt:
      'Create an Instagram Story that shows all loyalty tiers side by side — their names and cashback rates — making it visually exciting to level up. Highlight the jump in cashback rate between the lowest and highest tier. Use the actual tier names and percentages.',
  },
  {
    label: 'Refer & earn',
    subtitle: 'Referral program',
    prompt:
      'Create an Instagram Story promoting the referral program. Show how both the referrer and their friend benefit. Use the actual referral cashback details from the brand context. Make sharing feel rewarding and social. Reference the referral tagline if it fits.',
  },
]

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

  const [phase, setPhase] = useState<'idle' | 'generating' | 'drafts' | 'refining'>('idle')
  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>([])
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [messages, setMessages] = useState<StoryMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [refineLoading, setRefineLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  async function handleGenerateDrafts() {
    if (!currentStudio) return
    setPhase('generating')
    setDraftSlots(DRAFT_THEMES.map(() => 'loading'))
    await Promise.allSettled(DRAFT_THEMES.map((theme, i) => generateSingleDraft(theme, i)))
    setPhase('drafts')
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

  if (phase === 'idle') {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-semibold mb-2">AI Story Drafts</h1>
        <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
          Generate four ready-to-use Instagram Stories that explain your loyalty program — then pick one and refine it to your liking.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-8 text-left max-w-xs w-full">
          {DRAFT_THEMES.map((t) => (
            <div key={t.label} className="rounded-xl border border-white/[0.06] bg-secondary/40 px-3 py-2.5">
              <p className="text-xs font-medium">{t.label}</p>
              <p className="text-[11px] text-muted-foreground">{t.subtitle}</p>
            </div>
          ))}
        </div>
        <Button onClick={handleGenerateDrafts} size="lg">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate 4 Drafts
        </Button>
      </div>
    )
  }

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
                {allDone ? 'Pick a draft to customise' : 'Generating your drafts…'}
              </p>
            </div>
          </div>
          {allDone && (
            <div className="flex items-center gap-2">
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
              <Button variant="outline" size="sm" onClick={handleGenerateDrafts}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
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

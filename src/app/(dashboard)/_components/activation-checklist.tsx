'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Instagram,
  QrCode,
  Rocket,
  ScanLine,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react'
import { AppleLogo } from '@/components/ui/apple-logo'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStudio } from '@/hooks/use-studio'
import { useLandingPage } from '@/hooks/use-landing-page'
import { useActivation } from '@/hooks/use-activation'
import { createClient } from '@/lib/supabase/client'
import { SignupQR } from '@/components/landing/signup-qr'
import { APP_STORE_URL, GOOGLE_PLAY_URL, MARKETING_URL } from '@/lib/constants'
import { toast } from 'sonner'
import type { ActivationStepKey } from '@/lib/activation'

type StepDef = {
  key: ActivationStepKey
  icon: React.ComponentType<{ className?: string }>
  title: string
  blurb: string
}

const STEPS: StepDef[] = [
  {
    key: 'appDownloaded',
    icon: ScanLine,
    title: 'Download the Loyalink app on your phone',
    blurb: 'You will scan customer wallet passes from the app at checkout.',
  },
  {
    key: 'qrSaved',
    icon: QrCode,
    title: 'Print or save your QR code',
    blurb: 'Place it at the chair, consultation table, and reception. Customers scan and sign up.',
  },
  {
    key: 'linkShared',
    icon: Share2,
    title: 'Share your join link',
    blurb: 'Drop it in your Instagram bio and stories. Existing customers can sign up from home.',
  },
  {
    key: 'staffBriefed',
    icon: Users,
    title: 'Brief your staff',
    blurb: 'Every artist should mention the program during every consultation.',
  },
  {
    key: 'firstSignup',
    icon: Sparkles,
    title: 'Get your first customer signup',
    blurb: 'The flywheel starts the moment one customer joins. This checks off automatically.',
  },
]

export function ActivationChecklist() {
  const { currentStudio } = useStudio()
  const { data: landingPage } = useLandingPage()
  const { state, completed, total, markStep } = useActivation()
  const [openKey, setOpenKey] = useState<ActivationStepKey | null>(null)
  const supabase = createClient()

  const joinUrl = landingPage ? `${MARKETING_URL}/join/${landingPage.slug}` : ''

  const { data: passCount } = useQuery({
    queryKey: ['activation_pass_count', currentStudio?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('wallet_passes')
        .select('*', { count: 'exact', head: true })
        .eq('studio_id', currentStudio!.id)
        .in('status', ['active', 'installed'])
      return count ?? 0
    },
    enabled: !!currentStudio,
  })

  // Auto-tick "first signup" once we observe any active pass.
  useEffect(() => {
    if ((passCount ?? 0) > 0 && !state.steps.firstSignup) {
      markStep('firstSignup').catch(() => {})
    }
  }, [passCount, state.steps.firstSignup, markStep])

  if (completed === total) return null
  if (!currentStudio) return null

  const handleToggle = (key: ActivationStepKey) => {
    setOpenKey((current) => (current === key ? null : key))
  }

  const percent = Math.round((completed / total) * 100)

  return (
    <Card variant="glass" className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent overflow-hidden">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Get started</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completed} of {total} done — finish these to turn Loyalink into real signups.
            </p>
          </div>
          <span className="text-xs font-medium text-primary shrink-0">{percent}%</span>
        </div>

        <div className="h-1 w-full rounded-full bg-foreground/5 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="divide-y divide-border/40 -mx-2">
          {STEPS.map((step) => {
            const done = state.steps[step.key]
            const isOpen = openKey === step.key
            return (
              <li key={step.key} className="px-2">
                <button
                  type="button"
                  onClick={() => handleToggle(step.key)}
                  className="w-full flex items-center gap-3 py-3 text-left group"
                >
                  <span
                    className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      done
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-foreground/25 group-hover:border-primary/40'
                    }`}
                  >
                    {done && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-medium truncate ${
                        done ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}
                    >
                      {step.title}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="pb-4 pl-8 pr-1 space-y-3 animate-fade-up">
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.blurb}</p>
                    <StepActions
                      stepKey={step.key}
                      done={done}
                      joinUrl={joinUrl}
                      studioName={currentStudio.name}
                      onMark={() => markStep(step.key).catch(() => {})}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function StepActions({
  stepKey,
  done,
  joinUrl,
  studioName,
  onMark,
}: {
  stepKey: ActivationStepKey
  done: boolean
  joinUrl: string
  studioName?: string
  onMark: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const copyLink = async () => {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      toast.success('Link copied')
      onMark()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Long-press to copy manually.')
    }
  }

  if (stepKey === 'appDownloaded') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm" className="gap-1.5" onClick={onMark}>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            <AppleLogo className="h-3.5 w-3.5" />
            App Store
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5" onClick={onMark}>
          <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
            <PlayIcon className="h-3.5 w-3.5" />
            Google Play
          </a>
        </Button>
        {!done && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onMark}>
            Mark as done
          </Button>
        )}
      </div>
    )
  }

  if (stepKey === 'qrSaved') {
    return (
      <div className="space-y-3">
        {joinUrl ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setQrOpen((v) => !v)
              if (!qrOpen) onMark()
            }}
          >
            <QrCode className="h-3.5 w-3.5" />
            {qrOpen ? 'Hide QR code' : 'Show & download QR'}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href="/settings">
              <ExternalLink className="h-3.5 w-3.5" />
              Set up your landing page first
            </a>
          </Button>
        )}
        {qrOpen && joinUrl && (
          <div className="flex flex-col items-center gap-2 pt-1">
            <SignupQR url={joinUrl} studioName={studioName} size={140} className="w-40" />
            <p className="text-[11px] text-muted-foreground">Use the download icon to save it.</p>
          </div>
        )}
      </div>
    )
  }

  if (stepKey === 'linkShared') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink} disabled={!joinUrl}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy your link'}
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <a href="/stories">
            <Instagram className="h-3.5 w-3.5" />
            Open Stories generator
          </a>
        </Button>
      </div>
    )
  }

  if (stepKey === 'staffBriefed') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onMark} disabled={done}>
          {done ? <Check className="h-3.5 w-3.5" /> : null}
          {done ? 'Marked as briefed' : "I've briefed my team"}
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <a href="/welcome">
            <ExternalLink className="h-3.5 w-3.5" />
            Re-open the walkthrough
          </a>
        </Button>
      </div>
    )
  }

  // firstSignup — auto-detected
  if (done) {
    return <p className="text-xs text-primary">First signup recorded. Keep them coming.</p>
  }
  return (
    <p className="text-xs text-muted-foreground">
      Waiting for your first customer to sign up. As soon as a wallet pass is issued, this checks off automatically.
    </p>
  )
}

function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.6 2.3a1.3 1.3 0 0 0-.7 1.15v17.1c0 .47.26.9.7 1.13L13 12 3.6 2.3Zm10.7 10.45 2.7 2.7-10.3 5.93 7.6-8.63Zm0-1.5L6.7 2.62 17 8.55l-2.7 2.7Zm6.9 2.13-2.8 1.6-3-3 3-3 2.8 1.6c1.05.6 1.05 2.2 0 2.8Z" />
    </svg>
  )
}

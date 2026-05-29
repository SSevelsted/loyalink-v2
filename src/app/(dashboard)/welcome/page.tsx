'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Instagram,
  MessageSquareQuote,
  QrCode,
  ScanLine,
  Share2,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { AppleLogo } from '@/components/ui/apple-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useStudio } from '@/hooks/use-studio'
import { useLandingPage } from '@/hooks/use-landing-page'
import { useActivation } from '@/hooks/use-activation'
import { usePassTemplates } from '@/hooks/use-wallet'
import { useRewardsConfig } from '@/hooks/use-rewards'
import { SignupQR } from '@/components/landing/signup-qr'
import { APP_STORE_URL, GOOGLE_PLAY_URL, MARKETING_URL } from '@/lib/constants'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { DEFAULT_CARD_FIELDS } from '@/types/database'
import type { TierTheme, CardField } from '@/types/database'
import {
  LandingPageMockup,
  ScannerMockup,
  WalletPassMockup,
  type LandingMock,
  type PassMock,
} from '@/components/welcome/mockups'
import { toast } from 'sonner'

const STEPS = ['loop', 'customer', 'scan', 'pitch', 'staff'] as const
type StepId = (typeof STEPS)[number]

// Fallback light theme (cream) for studios whose pass template has not been
// created yet — matches the real default base-tier card.
const FALLBACK_THEME = {
  backgroundColor: '#F5F0EB',
  foregroundColor: '#2D2A26',
  labelColor: '#8A857F',
}

export default function WelcomePage() {
  const router = useRouter()
  const { currentStudio } = useStudio()
  const { data: landingPage } = useLandingPage()
  const { data: templates } = usePassTemplates()
  const { data: rewardsConfig } = useRewardsConfig()
  const { markStep, markWalkthroughSeen } = useActivation()
  const [stepIndex, setStepIndex] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const total = STEPS.length
  const stepId: StepId = STEPS[stepIndex]

  const joinUrl = useMemo(
    () => (landingPage ? `${MARKETING_URL}/join/${landingPage.slug}` : ''),
    [landingPage],
  )

  // Currency formatter for the studio (used for the wallet card balance).
  const currency = useMemo(
    () => ((currentStudio?.settings as Record<string, unknown> | undefined)?.currency as string) ?? 'kr',
    [currentStudio],
  )
  const fmt = useCallback((n: number) => formatAmount(n, getCurrencyConfig(currency)), [currency])

  // The studio's REAL wallet card — actual colours, logo, strip image, field
  // labels (in their language) and base cashback rate.
  const pass: PassMock = useMemo(() => {
    const studioName = currentStudio?.name ?? 'Your studio'
    const lp = (landingPage?.settings ?? {}) as Record<string, unknown>
    const accent = (lp.brandColor as string) || '#ff6a3d'

    const template = templates?.[0]
    const themes = (template?.tier_themes ?? {}) as Record<string, TierTheme>
    const baseSlug = rewardsConfig?.tiers?.[0]?.slug
    const theme =
      (baseSlug ? themes[baseSlug] : undefined) ??
      Object.values(themes).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]

    const fields = (template?.card_fields ?? DEFAULT_CARD_FIELDS) as CardField[]
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))
    const rate = rewardsConfig?.tiers?.[0]?.cashback_rate ?? 7.5

    return {
      studioName,
      backgroundColor: theme?.backgroundColor || FALLBACK_THEME.backgroundColor,
      foregroundColor: theme?.foregroundColor || FALLBACK_THEME.foregroundColor,
      labelColor: theme?.labelColor || FALLBACK_THEME.labelColor,
      logoUrl: theme?.logoOverride || template?.logo_url || null,
      stripUrl: theme?.stripImage || null,
      memberLabel: byKey['member']?.label || 'MEMBER',
      memberValue: 'Anna L.',
      balanceLabel: byKey['balance']?.label || 'BALANCE',
      cashbackLabel: byKey['cashback']?.label || 'CASHBACK',
      cashbackValue: `${rate}%`,
      accent,
    }
  }, [currentStudio, landingPage, templates, rewardsConfig])

  // The studio's real signup landing page.
  const landing: LandingMock = useMemo(() => {
    const studioName = currentStudio?.name ?? 'Your studio'
    const lp = (landingPage?.settings ?? {}) as Record<string, unknown>
    return {
      studioName,
      brandColor: (lp.brandColor as string) || '#7C3AED',
      backgroundColor: (lp.backgroundColor as string) || '#0A0A0A',
      textColor: (lp.textColor as string) || '#FFFFFF',
      logoUrl: (lp.logoUrl as string | null) || null,
      headline: landingPage?.headline || `Join ${studioName}`,
      buttonText: (lp.buttonText as string) || 'Get my card',
      benefits: [],
    }
  }, [currentStudio, landingPage])

  const handleNext = () => setStepIndex((i) => Math.min(total - 1, i + 1))
  const handleBack = () => setStepIndex((i) => Math.max(0, i - 1))

  const handleFinish = async () => {
    if (finishing) return
    setFinishing(true)
    try {
      await markWalkthroughSeen()
    } catch {
      // non-blocking — proceed to dashboard anyway
    }
    router.push('/overview')
  }

  const handleSkip = async () => {
    if (finishing) return
    setFinishing(true)
    try {
      await markWalkthroughSeen()
    } catch {
      /* noop */
    }
    router.push('/overview')
  }

  return (
    <div className="relative -mx-4 md:-mx-8 -my-4 md:-my-8 min-h-[calc(100dvh-2rem)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/8 blur-[160px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Step {stepIndex + 1} of {total}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>

        <div className="flex gap-1.5 mb-10">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-primary' : 'bg-foreground/10'
              }`}
            />
          ))}
        </div>

        <div className="animate-fade-up">
          {stepId === 'loop' && (
            <StepLoop
              pass={pass}
              landing={landing}
              balanceZero={fmt(0)}
              balanceFifty={fmt(50)}
              earned={`+${fmt(50)}`}
            />
          )}
          {stepId === 'customer' && (
            <StepCustomer pass={pass} landing={landing} balanceZero={fmt(0)} />
          )}
          {stepId === 'scan' && (
            <StepScan
              pass={pass}
              balanceFifty={fmt(50)}
              earned={`+${fmt(50)}`}
              onAppDownloadClick={() => markStep('appDownloaded').catch(() => {})}
            />
          )}
          {stepId === 'pitch' && (
            <StepPitch
              joinUrl={joinUrl}
              studioName={currentStudio?.name}
              onLinkShared={() => markStep('linkShared').catch(() => {})}
              onQrSaved={() => markStep('qrSaved').catch(() => {})}
            />
          )}
          {stepId === 'staff' && (
            <StepStaff
              studioName={currentStudio?.name}
              onBriefed={() => markStep('staffBriefed').catch(() => {})}
            />
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {stepIndex < total - 1 ? (
            <Button onClick={handleNext} variant="glow" className="gap-1.5">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} variant="glow" disabled={finishing} className="gap-1.5">
              Take me to my dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function StepHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="text-center space-y-4 mb-8">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-primary/80">{eyebrow}</p>
        <h1
          className="text-3xl md:text-4xl text-foreground leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  )
}

// A phone mockup paired side-by-side with its description, so each visual
// illustrates exactly the sentence next to it. Alternates sides for rhythm.
function StepRow({
  index,
  title,
  desc,
  mockup,
  reverse = false,
}: {
  index: number
  title: string
  desc: string
  mockup: React.ReactNode
  reverse?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center gap-5 sm:gap-8 sm:flex-row ${
        reverse ? 'sm:flex-row-reverse' : ''
      }`}
    >
      <div className="shrink-0">{mockup}</div>
      <div className="flex-1 text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold tabular-nums">
            {index}
          </span>
          <span className="text-xs uppercase tracking-wider text-primary/80">Step {index}</span>
        </div>
        <h3
          className="mt-2.5 text-lg md:text-xl text-foreground leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto sm:mx-0">
          {desc}
        </p>
      </div>
    </div>
  )
}

function StepLoop({
  pass,
  landing,
  balanceZero,
  balanceFifty,
  earned,
}: {
  pass: PassMock
  landing: LandingMock
  balanceZero: string
  balanceFifty: string
  earned: string
}) {
  return (
    <div>
      <StepHeader
        icon={Sparkles}
        eyebrow="Welcome to Loyalink"
        title={pass.studioName ? `${pass.studioName} is live` : 'You are live'}
        subtitle="Here is how loyalty works at your studio, end to end — what your customers do, what you do, and how the cashback flywheel starts."
      />

      <div className="space-y-10 sm:space-y-12">
        <StepRow
          index={1}
          title="A customer signs up"
          desc="They scan your QR code or tap your link, then fill in their details. It takes about 30 seconds — this is your real signup page."
          mockup={<LandingPageMockup size="md" landing={landing} />}
        />
        <StepRow
          index={2}
          reverse
          title="They get a wallet pass"
          desc="A digital loyalty card lands straight in Apple or Google Wallet — no app for them to install. This is your actual card design."
          mockup={<WalletPassMockup size="md" pass={pass} balanceValue={balanceZero} />}
        />
        <StepRow
          index={3}
          title="You scan them at checkout"
          desc="They open the pass on their phone, you scan the QR with the Loyalink app, and you enter the amount they paid."
          mockup={<ScannerMockup size="md" accent={pass.accent} />}
        />
        <StepRow
          index={4}
          reverse
          title="They earn cashback"
          desc={`Cashback lands on their balance automatically — your base rate is ${pass.cashbackValue}. They come back to spend it on their next tattoo.`}
          mockup={
            <WalletPassMockup
              size="md"
              pass={pass}
              balanceValue={balanceFifty}
              earnedValue={earned}
              showCashbackBurst
            />
          }
        />
      </div>
    </div>
  )
}

function StepCustomer({
  pass,
  landing,
  balanceZero,
}: {
  pass: PassMock
  landing: LandingMock
  balanceZero: string
}) {
  return (
    <div>
      <StepHeader
        icon={Wallet}
        eyebrow="The customer side"
        title="What your customer experiences"
        subtitle="Your customers do not download anything. The loyalty card lives in the wallet app they already use every day."
      />

      <div className="space-y-10 sm:space-y-12 mb-10">
        <StepRow
          index={1}
          title="They open your signup page"
          desc="From the QR code or your link. They enter name, email and phone — that is the whole signup, about 30 seconds."
          mockup={<LandingPageMockup size="md" landing={landing} />}
        />
        <StepRow
          index={2}
          reverse
          title="The pass appears instantly"
          desc="An Apple Wallet or Google Wallet pass shows up on their phone right away — like a boarding pass or Starbucks card, but it is your card."
          mockup={<WalletPassMockup size="md" pass={pass} balanceValue={balanceZero} />}
        />
      </div>

      <Card variant="glass" className="rounded-2xl border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground">Why this matters</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            The pass sits next to their plane tickets and credit cards. They see your studio every time they open
            their wallet. That is what brings them back.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StepScan({
  pass,
  balanceFifty,
  earned,
  onAppDownloadClick,
}: {
  pass: PassMock
  balanceFifty: string
  earned: string
  onAppDownloadClick: () => void
}) {
  return (
    <div>
      <StepHeader
        icon={ScanLine}
        eyebrow="What you do"
        title="When a customer comes in"
        subtitle="Download the Loyalink app on your phone — that is the scanner you will use at the chair or at the register."
      />

      <div className="space-y-10 sm:space-y-12 mb-10">
        <StepRow
          index={1}
          title="Scan their pass"
          desc="Open the Loyalink app, tap Scan, and point the camera at the QR on their wallet pass. It takes about 5 seconds."
          mockup={<ScannerMockup size="md" accent={pass.accent} />}
        />
        <StepRow
          index={2}
          reverse
          title="Cashback gets added"
          desc={`Enter the amount they paid and cashback lands on their balance automatically at ${pass.cashbackValue}. Next visit, they can spend it — the flywheel starts.`}
          mockup={
            <WalletPassMockup
              size="md"
              pass={pass}
              balanceValue={balanceFifty}
              earnedValue={earned}
              showCashbackBurst
            />
          }
        />
      </div>

      <Card variant="glass" className="rounded-2xl border-primary/20 bg-gradient-to-r from-primary/8 to-transparent">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground">Download the app on your phone</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Put it on the phone you keep at the front desk or in your pocket during sessions. Scanning takes about 5
            seconds.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button asChild variant="outline" size="sm" className="gap-2" onClick={onAppDownloadClick}>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <AppleLogo className="h-4 w-4" />
                App Store
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2" onClick={onAppDownloadClick}>
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
                <PlayIcon className="h-4 w-4" />
                Google Play
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const PITCH_SCRIPT = `Hey, we just launched a loyalty program — you'll get cashback on every tattoo you do with us, automatically. Want me to add you? Takes 30 seconds — just scan this QR code.`

function StepPitch({
  joinUrl,
  studioName,
  onLinkShared,
  onQrSaved,
}: {
  joinUrl: string
  studioName?: string
  onLinkShared: () => void
  onQrSaved: () => void
}) {
  const [copied, setCopied] = useState<'script' | 'link' | null>(null)
  const [qrOpen, setQrOpen] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async (kind: 'script' | 'link', value: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      if (kind === 'link') {
        toast.success('Link copied')
        onLinkShared()
      } else {
        toast.success('Script copied')
      }
    } catch {
      toast.error('Could not copy. Long-press to copy manually.')
    }
  }

  return (
    <div>
      <StepHeader
        icon={MessageSquareQuote}
        eyebrow="Getting your first signups"
        title="How to invite your customers"
        subtitle="Two channels do most of the work: the QR code in your studio, and your link on Instagram. Ask every customer, every time."
      />

      <div className="grid gap-3">
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareQuote className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Say this during the consultation</p>
            </div>
            <blockquote className="text-sm text-foreground/90 italic leading-relaxed border-l-2 border-primary/40 pl-4 my-3">
              &ldquo;{PITCH_SCRIPT}&rdquo;
            </blockquote>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tip: bring it up during the consultation, not at checkout. It feels like a gift, not an upsell — and you
              get the signup before they leave.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => copy('script', PITCH_SCRIPT)}
            >
              {copied === 'script' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'script' ? 'Copied!' : 'Copy script'}
            </Button>
          </CardContent>
        </Card>

        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Instagram className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">For existing customers</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Drop your link in your Instagram bio, post it to stories with a swipe-up sticker, and DM your regulars.
              They sign up from their couch — the pass shows up on their phone instantly.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => copy('link', joinUrl)}
                disabled={!joinUrl}
              >
                {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied === 'link' ? 'Copied!' : 'Copy your link'}
              </Button>
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <a href="/stories">
                  <Sparkles className="h-3.5 w-3.5" />
                  Open Stories generator
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Print your QR code</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Put it on the chair, the consultation table, and the reception desk. Customers scan with their phone
              camera — no link to type.
            </p>
            {joinUrl && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQrOpen((v) => !v)
                    if (!qrOpen) onQrSaved()
                  }}
                  className="gap-1.5"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {qrOpen ? 'Hide QR code' : 'Show & download QR'}
                </Button>
                {qrOpen && (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    <SignupQR url={joinUrl} studioName={studioName} size={160} className="w-48" />
                    <p className="text-[11px] text-muted-foreground">Use the download icon to save it as a PNG.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const STAFF_BRIEF = `We just launched a loyalty program. Here is what I need from every artist and front-desk person:

1. We have a loyalty program — every customer gets cashback on every tattoo, automatically.
2. Ask every customer, every time — not just new ones. Existing customers can sign up too.
3. Bring it up during the consultation, not at checkout. It feels like a gift, not an upsell.
4. The signup takes 30 seconds. They scan our QR code, fill in name + email + phone, and a wallet pass lands on their phone.
5. When they come in to pay, they show us the wallet pass. We scan it with the Loyalink app and enter the amount. They earn cashback automatically.

If a customer hesitates: "It's free, it's automatic, and the card lives in your phone wallet — you don't have to install anything." That is usually enough.`

function StepStaff({
  studioName,
  onBriefed,
}: {
  studioName?: string
  onBriefed: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [marked, setMarked] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(STAFF_BRIEF)
      setCopied(true)
      toast.success('Staff brief copied — paste it into your team chat')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Long-press to copy manually.')
    }
  }

  const handleMark = () => {
    if (marked) return
    setMarked(true)
    onBriefed()
    toast.success('Nice — your staff is briefed')
  }

  return (
    <div>
      <StepHeader
        icon={Users}
        eyebrow="The multiplier"
        title="Brief your staff"
        subtitle="The studios that win at loyalty are the ones where every artist mentions it during every consultation. Get your team aligned on day one."
      />

      <div className="grid gap-3">
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">
              {studioName ? `For the ${studioName} team` : 'For your team'}
            </p>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-sans">
{STAFF_BRIEF}
            </pre>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy staff brief'}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleMark} disabled={marked}>
                {marked ? <Check className="h-3.5 w-3.5" /> : null}
                {marked ? 'Marked as briefed' : "I've briefed my team"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="rounded-2xl border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">What happens after this</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              You will land on your dashboard. There is a Get Started checklist there waiting for you — it tracks the
              same things we just covered so you can come back to them, and shows your staff what is left to do.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.6 2.3a1.3 1.3 0 0 0-.7 1.15v17.1c0 .47.26.9.7 1.13L13 12 3.6 2.3Zm10.7 10.45 2.7 2.7-10.3 5.93 7.6-8.63Zm0-1.5L6.7 2.62 17 8.55l-2.7 2.7Zm6.9 2.13-2.8 1.6-3-3 3-3 2.8 1.6c1.05.6 1.05 2.2 0 2.8Z" />
    </svg>
  )
}

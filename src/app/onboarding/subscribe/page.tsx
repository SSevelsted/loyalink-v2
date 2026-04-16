'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, Check, Zap, Tag, LogOut } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { isNative } from '@/lib/platform'

type Plan = 'basic' | 'pro'

type CouponData = {
  id: string
  percentOff: number | null
  amountOff: number | null
  currency: string | null
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths: number | null
  name: string | null
}

const PLAN_PRICES: Record<Plan, number> = { basic: 49, pro: 79 }

const PLANS: Record<Plan, {
  name: string
  base: string
  description: string
  features: string[]
  popular?: boolean
}> = {
  basic: {
    name: 'Basic',
    base: '€49/mo',
    description: 'Perfect for independent studios',
    features: [
      '1 location',
      'Apple & Google Wallet passes',
      'Cashback loyalty program',
      'Referral program',
      'Basic analytics',
    ],
  },
  pro: {
    name: 'Pro',
    base: '€79/mo',
    description: 'For growing studios with a team',
    features: [
      'Up to 5 locations',
      'Everything in Basic',
      'Multi-tier loyalty (Silver/Gold/VIP)',
      'Automated notifications',
      'Audience segmentation',
      '5 team logins + priority support',
    ],
    popular: true,
  },
}

const MEMBER_RATES = [
  { label: 'First 100 members', rate: '€0.79 each' },
  { label: '101 – 500', rate: '€0.59 each' },
  { label: '501 – 2,000', rate: '€0.39 each' },
  { label: '2,000+', rate: '€0.29 each' },
]

type Step1Data = {
  studioName: string
  name: string
  plan: Plan
  promoCode: string
}

type StripeStatus = 'loading' | 'ready' | 'unavailable'

type PaymentStepProps = {
  step1: Step1Data
  customerId: string
  coupon: CouponData | null
  onBack: () => void
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

async function parseResponseData(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as { error?: string }
  } catch {
    return null
  }
}

function formatDiscountLabel(coupon: CouponData): string {
  const discount = coupon.percentOff
    ? `${coupon.percentOff}% off`
    : coupon.amountOff
      ? `€${(coupon.amountOff / 100).toFixed(coupon.amountOff % 100 === 0 ? 0 : 2)} off`
      : ''
  if (coupon.duration === 'once') return `${discount} first month`
  if (coupon.duration === 'repeating' && coupon.durationInMonths)
    return `${discount} for ${coupon.durationInMonths} months`
  if (coupon.duration === 'forever') return `${discount} forever`
  return discount
}

function getDiscountedPrice(plan: Plan, coupon: CouponData): number {
  const base = PLAN_PRICES[plan]
  if (coupon.percentOff) return base * (1 - coupon.percentOff / 100)
  if (coupon.amountOff) return Math.max(0, base - coupon.amountOff / 100)
  return base
}

function PaymentStep({ step1, customerId, coupon, onBack }: PaymentStepProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const plan = PLANS[step1.plan]

  const [trialEndDate] = useState(() =>
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setError(null)
    setLoading(true)
    try {
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      })

      if (setupError) {
        setError(setupError.message ?? 'Payment setup failed')
        return
      }

      const paymentMethodId =
        typeof setupIntent?.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id ?? null

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25_000)

      let res: Response
      try {
        res = await fetch('/api/onboarding/subscribe/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: step1.name,
            studioName: step1.studioName,
            plan: step1.plan,
            customerId,
            paymentMethodId,
            promoCode: step1.promoCode || undefined,
          }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }

      const data = await parseResponseData(res)
      if (!res.ok) {
        setError(data?.error ?? 'Setup failed')
        return
      }

      // Full reload, not router.push, so useStudioLoader re-fetches from
      // scratch and picks up the newly created studio. A client-side push
      // keeps the cached "no studio" state from before the POST.
      window.location.href = '/setup'
    } catch (error) {
      setError(getErrorMessage(error, 'Setup took too long. Please refresh and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors active:opacity-70"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* Plan summary */}
      <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{plan.name} plan</span>
          {coupon ? (
            <span className="text-sm font-semibold">
              <span className="line-through text-muted-foreground">{plan.base}</span>{' '}
              <span className="text-emerald-400">
                €{getDiscountedPrice(step1.plan, coupon).toFixed(getDiscountedPrice(step1.plan, coupon) % 1 === 0 ? 0 : 2)}/mo
              </span>
              <span className="text-foreground"> + usage</span>
            </span>
          ) : (
            <span className="text-sm font-semibold text-foreground">{plan.base} + usage</span>
          )}
        </div>
        <div className="border-t border-border/40 pt-3 space-y-1.5">
          {MEMBER_RATES.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="text-xs text-foreground">{r.rate}</span>
            </div>
          ))}
        </div>
        {step1.promoCode && coupon && (
          <div className="border-t border-border/40 pt-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-3 py-2">
              <Tag className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-emerald-400">{step1.promoCode}</span>
              <span className="text-xs text-muted-foreground">— {formatDiscountLabel(coupon)}</span>
            </div>
          </div>
        )}
        <div className="border-t border-border/40 pt-3 space-y-1.5">
          {['14-day free trial', 'Cancel anytime before day 15'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="flex-shrink-0 h-4 w-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-emerald-400" />
              </div>
              <span className="text-xs text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PaymentElement options={{ wallets: { applePay: 'never', googlePay: 'never' }, link: { display: 'never' } } as any} />

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="glow"
        size="lg"
        className="w-full font-medium"
        disabled={loading || !stripe || !elements}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up your studio...
          </span>
        ) : (
          'Start free trial — no charge today'
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Trial ends {trialEndDate}. You won&apos;t be charged until then. Cancel anytime.
      </p>
    </form>
  )
}

export default function OnboardingSubscribePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  const stripePromiseRef = useRef<ReturnType<typeof loadStripe> | null>(null)
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>('loading')
  const [stripeMessage, setStripeMessage] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [showPromo, setShowPromo] = useState(false)
  const [step1, setStep1] = useState<Step1Data>({
    studioName: '',
    name: '',
    plan: 'pro',
    promoCode: '',
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [coupon, setCoupon] = useState<CouponData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Protect route: require auth, block on native (App Store 3.1.1).
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/onboarding/subscribe')
      return
    }
    if (isNative()) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  // Pre-fill name from auth metadata if available
  useEffect(() => {
    if (user?.user_metadata?.full_name && !step1.name) {
      setStep1((p) => ({ ...p, name: user.user_metadata.full_name as string }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    let cancelled = false

    const loadStripeConfig = async () => {
      try {
        const response = await fetch('/api/stripe/config', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load Stripe config')
        const data = (await response.json()) as { billingEnabled: boolean; publishableKey: string }
        if (cancelled) return
        if (!data.billingEnabled || !data.publishableKey) {
          setStripeStatus('unavailable')
          setStripeMessage('Payments are temporarily unavailable. Please try again shortly.')
          return
        }
        if (!stripePromiseRef.current) {
          stripePromiseRef.current = loadStripe(data.publishableKey)
        }
        setStripePromise(stripePromiseRef.current)
        setStripeStatus('ready')
      } catch {
        if (cancelled) return
        setStripeStatus('unavailable')
        setStripeMessage('We could not initialize secure payment setup. Please refresh and try again.')
      }
    }

    void loadStripeConfig()
    return () => {
      cancelled = true
    }
  }, [])

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (stripeStatus === 'loading') {
      setError('Secure payment setup is still loading. Please try again in a moment.')
      return
    }

    if (stripeStatus === 'unavailable' || !stripePromise) {
      setError(stripeMessage ?? 'Payments are temporarily unavailable. Please try again shortly.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/onboarding/subscribe/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioName: step1.studioName,
          promoCode: step1.promoCode || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      setClientSecret(data.clientSecret)
      setCustomerId(data.customerId)
      setCoupon(data.coupon ?? null)
      setStep(2)
    } catch {
      setError('We could not start secure payment setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-background items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
      </div>
      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-primary">
              <LogoMark className="h-full w-full text-primary p-2" />
            </div>
          </Link>
          <h1 className="text-display-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Create your studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signed in as <span className="text-foreground">{user.email}</span>
          </p>
        </div>

        <div className="rounded-2xl glass-card p-6">
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              {/* Plan selector */}
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStep1((p) => ({ ...p, plan: key }))}
                    className={`relative rounded-xl border p-3 text-left transition-all ${
                      step1.plan === key
                        ? 'border-primary/60 bg-primary/8'
                        : 'border-border/50 bg-secondary/30 hover:border-border'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        <Zap className="h-2.5 w-2.5" />
                        Popular
                      </span>
                    )}
                    <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                    <p className="text-xs text-primary font-medium mt-0.5">{plan.base}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{plan.description}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-secondary/20 border border-border/30 px-3 py-2.5 space-y-1.5">
                {PLANS[step1.plan].features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studioName" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Studio name
                </Label>
                <Input
                  id="studioName"
                  type="text"
                  value={step1.studioName}
                  onChange={(e) => setStep1((p) => ({ ...p, studioName: e.target.value }))}
                  className="bg-secondary/50 h-12"
                  placeholder="Black Anchor Tattoo"
                  autoComplete="organization"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Your name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={step1.name}
                  onChange={(e) => setStep1((p) => ({ ...p, name: e.target.value }))}
                  className="bg-secondary/50 h-12"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                />
              </div>

              {!showPromo ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Have a promo code?
                </button>
              ) : (
                <div className="space-y-2 animate-fade-up">
                  <Label htmlFor="promoCode" className="text-xs text-muted-foreground uppercase tracking-wider">
                    Promo code
                  </Label>
                  <Input
                    id="promoCode"
                    type="text"
                    value={step1.promoCode}
                    onChange={(e) => setStep1((p) => ({ ...p, promoCode: e.target.value.toUpperCase() }))}
                    className="bg-secondary/50 h-12"
                    placeholder="e.g. WELCOME2025"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              {!error && stripeStatus === 'loading' && (
                <div className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
                  <p className="text-sm text-muted-foreground">Loading secure payment setup...</p>
                </div>
              )}
              {!error && stripeStatus === 'unavailable' && stripeMessage && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{stripeMessage}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="glow"
                size="lg"
                className="w-full font-medium"
                disabled={loading || stripeStatus === 'loading' || stripeStatus === 'unavailable'}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Continuing...
                  </span>
                ) : stripeStatus === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading secure checkout...
                  </span>
                ) : (
                  'Continue →'
                )}
              </Button>

              <div className="flex items-center justify-center gap-3 pt-1">
                {['14 days free', 'Cancel anytime', '5-min setup'].map((t) => (
                  <span key={t} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Check className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </form>
          ) : clientSecret && customerId && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorBackground: 'hsl(240 6% 10%)',
                    colorText: 'hsl(0 0% 98%)',
                    colorTextPlaceholder: 'hsl(240 5% 40%)',
                    colorPrimary: 'hsl(262 83% 68%)',
                    colorDanger: 'hsl(0 72% 51%)',
                    borderRadius: '8px',
                    fontSizeBase: '14px',
                    spacingUnit: '4px',
                  },
                  rules: {
                    '.Input': {
                      backgroundColor: 'hsl(240 5% 14%)',
                      border: '1px solid hsl(240 5% 20%)',
                      boxShadow: 'none',
                    },
                    '.Input:focus': {
                      border: '1px solid hsl(262 83% 68% / 0.6)',
                      boxShadow: '0 0 0 1px hsl(262 83% 68% / 0.3)',
                    },
                    '.Label': {
                      color: 'hsl(240 5% 55%)',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    },
                    '.Tab': { display: 'none' },
                    '.TabLabel': { display: 'none' },
                  },
                },
              }}
            >
              <PaymentStep
                step1={step1}
                customerId={customerId}
                coupon={coupon}
                onBack={() => setStep(1)}
              />
            </Elements>
          ) : clientSecret && customerId ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading secure payment form...
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors active:opacity-70"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, Check, Zap, Wallet, Users, TrendingUp, Bell } from 'lucide-react'
import { LogoMark } from '@/components/logo'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

type Plan = 'basic' | 'pro'

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

const BENEFITS = [
  {
    icon: Wallet,
    title: 'Apple & Google Wallet',
    body: 'Passes in customers\' phones in 30 seconds. No app download.',
  },
  {
    icon: TrendingUp,
    title: 'Cashback that sticks',
    body: 'Rewards they can only spend with you — keeping money in your ecosystem.',
  },
  {
    icon: Users,
    title: 'Referral engine',
    body: 'Turn happy customers into your best salespeople automatically.',
  },
  {
    icon: Bell,
    title: 'Re-engagement notifications',
    body: 'Win back lapsed customers with targeted wallet push notifications.',
  },
]

type Step1Data = {
  studioName: string
  name: string
  email: string
  password: string
  plan: Plan
  promoCode: string
}

type PaymentStepProps = {
  step1: Step1Data
  customerId: string
  onBack: () => void
}

function PaymentStep({ step1, customerId, onBack }: PaymentStepProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const plan = PLANS[step1.plan]

  const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setError(null)
    setLoading(true)

    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })

    if (setupError) {
      setError(setupError.message ?? 'Payment setup failed')
      setLoading(false)
      return
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id ?? null

    const res = await fetch('/api/signup/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: step1.name,
        email: step1.email,
        password: step1.password,
        studioName: step1.studioName,
        plan: step1.plan,
        customerId,
        paymentMethodId,
        promoCode: step1.promoCode || undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Signup failed')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: step1.email,
      password: step1.password,
    })

    if (signInError) {
      setError('Account created but sign-in failed. Please go to the login page.')
      setLoading(false)
      return
    }

    router.push('/setup')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* Plan summary */}
      <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{plan.name} plan</span>
          <span className="text-sm font-semibold text-foreground">{plan.base} + usage</span>
        </div>
        <div className="border-t border-border/40 pt-3 space-y-1.5">
          {MEMBER_RATES.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="text-xs text-foreground">{r.rate}</span>
            </div>
          ))}
        </div>
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
      <PaymentElement options={{ wallets: { applePay: 'never', googlePay: 'never' }, fields: { billingDetails: { address: { country: 'never' } } }, link: { display: 'never' } } as any} />

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
          'Start Free Trial — no charge today'
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Trial ends {trialEndDate}. You won&apos;t be charged until then. Cancel anytime.
      </p>
    </form>
  )
}

function SignupForm() {
  const searchParams = useSearchParams()
  const initialPlan = (searchParams.get('plan') === 'basic' ? 'basic' : 'pro') as Plan

  const [step, setStep] = useState<1 | 2>(1)
  const [step1, setStep1] = useState<Step1Data>({
    studioName: '',
    name: '',
    email: '',
    password: '',
    plan: initialPlan,
    promoCode: '',
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!stripePromise) {
      setError('Stripe is not configured. Please contact support.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/signup/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: step1.email, studioName: step1.studioName }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    setClientSecret(data.clientSecret)
    setCustomerId(data.customerId)
    setStep(2)
    setLoading(false)
  }

  return (
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

          {/* Selected plan features */}
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
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              value={step1.email}
              onChange={(e) => setStep1((p) => ({ ...p, email: e.target.value }))}
              className="bg-secondary/50 h-12"
              placeholder="you@studio.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={step1.password}
              onChange={(e) => setStep1((p) => ({ ...p, password: e.target.value }))}
              className="bg-secondary/50 h-12"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promoCode" className="text-xs text-muted-foreground uppercase tracking-wider">
              Promo code <span className="normal-case">(optional)</span>
            </Label>
            <Input
              id="promoCode"
              type="text"
              value={step1.promoCode}
              onChange={(e) => setStep1((p) => ({ ...p, promoCode: e.target.value.toUpperCase() }))}
              className="bg-secondary/50 h-12"
              placeholder="e.g. LOYALINK6FREE"
              autoComplete="off"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <Button type="submit" variant="glow" size="lg" className="w-full font-medium" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Continuing...
              </span>
            ) : (
              'Continue →'
            )}
          </Button>

          {/* Trust row */}
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
            onBack={() => setStep(1)}
          />
        </Elements>
      ) : null}
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-primary/6 blur-[160px]" />
      </div>

      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 border-r border-border/30 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <div className="relative space-y-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center glow-primary">
              <LogoMark className="h-full w-full text-primary p-1.5" />
            </div>
            <span className="font-semibold text-foreground text-lg" style={{ fontFamily: 'var(--font-display)' }}>Loyalink</span>
          </Link>

          {/* Headline */}
          <div className="space-y-3">
            <h1
              className="text-3xl font-bold text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Stop giving away<br />your margins.
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Give clients a real reason to come back. Cashback they can only spend with you — no stamp cards, no Groupon, no discounts.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <b.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative rounded-2xl border border-border/40 bg-card/40 p-5 space-y-3">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            &ldquo;We stopped running Groupon deals the same month we launched Loyalink. Our repeat visit rate went up 34% in 60 days.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              MJ
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Maria Jensen</p>
              <p className="text-[11px] text-muted-foreground">Black Anchor Tattoo Studio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="relative w-full max-w-sm animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-primary">
                <LogoMark className="h-full w-full text-primary p-2" />
              </div>
            </Link>
            <h1 className="text-display-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Start your free trial
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              14 days free. No charge until day 15.
            </p>
          </div>

          {/* Desktop heading above form */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Create your account
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              14 days free · No charge until day 15
            </p>
          </div>

          <Suspense>
            <SignupForm />
          </Suspense>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

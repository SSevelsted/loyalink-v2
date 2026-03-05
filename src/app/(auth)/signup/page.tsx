'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2, ArrowLeft, Check, Zap } from 'lucide-react'

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
      'Stamp card + cashback',
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
  email: string
  password: string
  plan: Plan
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

  const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
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
          {['30-day free trial', 'Cancel anytime before day 30'].map((item) => (
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

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [step1, setStep1] = useState<Step1Data>({
    studioName: '',
    name: '',
    email: '',
    password: '',
    plan: 'pro',
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
            <span className="text-primary text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>L</span>
          </div>
          <h1 className="text-display-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Start your free trial
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            30 days free. No charge until day 31.
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
                  placeholder="My Studio"
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

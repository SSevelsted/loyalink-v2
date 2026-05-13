'use client'

import { useEffect, useState } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ExternalLink, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isNative } from '@/lib/platform'
import type { SubscriptionStatus } from '@/lib/stripe'

const STATUS_LABELS: Record<string, string> = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  agency: 'Agency',
}

const STATUS_VARIANTS: Record<string, string> = {
  trial: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  past_due: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  agency: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
}

function getDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

export function BillingSection() {
  const { currentStudio } = useStudio()
  const [loading, setLoading] = useState(false)
  const [onNative, setOnNative] = useState(false)

  useEffect(() => {
    setOnNative(isNative())
  }, [])

  const status = currentStudio?.subscription_status as SubscriptionStatus | null
  const trialEndsAt = currentStudio?.trial_ends_at
  const plan = (currentStudio?.settings as Record<string, unknown>)?.plan as string | undefined
  const planLabel = plan === 'pro' ? 'Pro' : plan === 'basic' ? 'Basic' : 'Free'

  const daysLeft = trialEndsAt ? getDaysRemaining(trialEndsAt) : null

  async function handleManageBilling() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Unable to open billing portal')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Billing</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and payment details.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Current plan</p>
            <p className="text-xl font-semibold text-foreground">{planLabel}</p>
          </div>
          {status && (
            <Badge
              variant="outline"
              className={cn('text-xs capitalize', STATUS_VARIANTS[status] ?? '')}
            >
              {STATUS_LABELS[status] ?? status}
            </Badge>
          )}
        </div>

        {status === 'trial' && trialEndsAt && (
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">
              {daysLeft === 0
                ? 'Your trial ends today'
                : daysLeft === 1
                  ? '1 day remaining in your trial'
                  : `${daysLeft} days remaining in your trial`}
            </p>
            <p className="text-muted-foreground mt-0.5">
              Trial ends on {new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        {status === 'past_due' && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Payment failed</p>
            <p className="text-muted-foreground mt-0.5">
              Please update your payment method to avoid service interruption.
            </p>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Subscription cancelled</p>
            <p className="text-muted-foreground mt-0.5">
              Reactivate your subscription to regain access.
            </p>
          </div>
        )}

        {onNative ? (
          <div className="rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm space-y-2">
            <p className="font-medium text-foreground">Need to make changes?</p>
            <p className="text-muted-foreground leading-relaxed">
              To update your plan, payment method, or cancel your subscription, please contact support.
            </p>
            <a
              href="mailto:hello@loyalink.ai"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline underline-offset-4"
            >
              <Mail className="h-3.5 w-3.5" />
              hello@loyalink.ai
            </a>
          </div>
        ) : (
          <Button
            onClick={handleManageBilling}
            disabled={loading}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            {loading ? 'Redirecting…' : 'Manage subscription'}
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>
        )}
      </div>
    </div>
  )
}

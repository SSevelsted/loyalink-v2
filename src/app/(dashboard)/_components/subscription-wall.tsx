'use client'

import { useEffect, useState } from 'react'
import { CreditCard, AlertTriangle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isNative } from '@/lib/platform'
import type { SubscriptionStatus } from '@/lib/stripe'

interface SubscriptionWallProps {
  status: SubscriptionStatus | null | undefined
}

export function SubscriptionWall({ status }: SubscriptionWallProps) {
  const [loading, setLoading] = useState(false)
  const [onNative, setOnNative] = useState(false)

  useEffect(() => {
    setOnNative(isNative())
  }, [])

  const isPastDue = status === 'past_due'

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
    <div className="flex min-h-dvh items-center justify-center bg-background p-4 pt-safe pb-safe">
      <div className="glass-card w-full max-w-md rounded-2xl border border-border/50 p-8 text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {isPastDue ? 'Payment required' : 'Your trial has ended'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isPastDue
              ? 'Your last payment failed. Please update your payment method to continue using Loyalink.'
              : 'Your free trial has ended. Add a payment method to reactivate your account and keep your data.'}
          </p>
        </div>

        <div className="space-y-3">
          {onNative ? (
            <div className="rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm space-y-2 text-left">
              <p className="font-medium text-foreground">Need to reactivate?</p>
              <p className="text-muted-foreground leading-relaxed">
                Please contact support and we&apos;ll help you get your account back up and running.
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
            <>
              <Button
                className="w-full"
                onClick={handleManageBilling}
                disabled={loading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {loading ? 'Redirecting…' : 'Manage billing'}
              </Button>
              <a
                href="mailto:hello@loyalink.ai"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact support
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

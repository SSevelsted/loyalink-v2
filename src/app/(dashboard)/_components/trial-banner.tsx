'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'loyalink_trial_banner_dismissed'

interface TrialBannerProps {
  trialEndsAt: string
}

function getDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  })

  const daysLeft = getDaysRemaining(trialEndsAt)

  if (dismissed || daysLeft > 7) return null

  const isUrgent = daysLeft <= 5

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function handleManageBilling(e: React.MouseEvent) {
    e.preventDefault()
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2.5 text-sm',
        isUrgent
          ? 'bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400'
          : 'bg-secondary border-b border-border text-muted-foreground'
      )}
    >
      <span>
        <strong className="font-medium text-foreground">
          {daysLeft === 0 ? 'Your trial ends today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial`}
        </strong>
        {' — '}
        <button
          onClick={handleManageBilling}
          className="underline underline-offset-2 hover:no-underline transition-all"
        >
          Manage billing →
        </button>
      </span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

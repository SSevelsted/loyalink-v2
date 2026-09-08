'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial-code-format'

export type TrialCodeCheck = {
  /** 'unknown' means not one of our trial codes — it may still be a Stripe promo code, so do not show it as an error */
  status: 'idle' | 'checking' | 'valid' | 'used_up' | 'expired' | 'unknown'
  trialDays: number
  reason: string | null
}

const IDLE: TrialCodeCheck = { status: 'idle', trialDays: DEFAULT_TRIAL_DAYS, reason: null }
const CHECKING: TrialCodeCheck = { status: 'checking', trialDays: DEFAULT_TRIAL_DAYS, reason: null }

/**
 * Resolve a typed or link-supplied code against the public validate endpoint so
 * the signup form can show the real trial length before the visitor commits.
 * The server always re-checks at signup — this is presentation only.
 */
export function useTrialCodeCheck(code: string): TrialCodeCheck {
  // Results are stored against the code they belong to, so a stale answer is
  // never shown while a newer code is still in flight.
  const [result, setResult] = useState<{ code: string; check: TrialCodeCheck } | null>(null)
  const trimmed = code.trim()

  useEffect(() => {
    if (!trimmed) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trial-codes/validate?code=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          setResult({ code: trimmed, check: { ...IDLE, status: 'unknown' } })
          return
        }
        const data = (await res.json()) as {
          valid: boolean
          kind?: TrialCodeCheck['status']
          trialDays?: number
          reason?: string
        }
        setResult({
          code: trimmed,
          check: {
            status: data.valid ? 'valid' : data.kind ?? 'unknown',
            trialDays: typeof data.trialDays === 'number' ? data.trialDays : DEFAULT_TRIAL_DAYS,
            reason: data.reason ?? null,
          },
        })
      } catch {
        // Aborted or offline — leave the default copy in place
        if (!controller.signal.aborted) setResult({ code: trimmed, check: IDLE })
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  if (!trimmed) return IDLE
  return result?.code === trimmed ? result.check : CHECKING
}

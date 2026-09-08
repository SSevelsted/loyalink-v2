import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TrialCode } from '@/types/database'

import { DEFAULT_TRIAL_DAYS } from '@/lib/trial-code-format'

export { DEFAULT_TRIAL_DAYS }
export const MAX_TRIAL_DAYS = 365

// No 0/O/1/I so codes survive being read aloud or retyped from a screenshot.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Custom codes are the public-facing half of a campaign link, so keep them URL-clean. */
const CUSTOM_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/

export function normalizeTrialCode(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase()
}

/** e.g. TRIAL45-K7M2PQ — the prefix tells the recipient what they are getting. */
export function generateTrialCode(trialDays: number): string {
  const bytes = crypto.randomBytes(6)
  let suffix = ''
  for (const b of bytes) suffix += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return `TRIAL${trialDays}-${suffix}`
}

export function isValidCustomCode(code: string): boolean {
  return CUSTOM_CODE_PATTERN.test(code)
}

export type TrialCodeStatus = 'available' | 'used_up' | 'expired'

export function getTrialCodeStatus(
  code: Pick<TrialCode, 'expires_at' | 'max_uses' | 'use_count'>,
  now = Date.now()
): TrialCodeStatus {
  if (code.expires_at && new Date(code.expires_at).getTime() < now) return 'expired'
  if (code.max_uses != null && code.use_count >= code.max_uses) return 'used_up'
  return 'available'
}

/** Remaining redemptions, or null when the code is unlimited. */
export function remainingUses(code: Pick<TrialCode, 'max_uses' | 'use_count'>): number | null {
  return code.max_uses == null ? null : Math.max(code.max_uses - code.use_count, 0)
}

export type TrialCodeLookup =
  | { kind: 'none' }
  | { kind: 'valid'; code: TrialCode }
  | { kind: 'invalid'; status: Exclude<TrialCodeStatus, 'available'>; code: TrialCode }

/**
 * Look a user-entered code up in trial_codes. `none` means the code is not a
 * trial code at all (callers fall through to Stripe promotion codes).
 */
export async function lookupTrialCode(
  supabase: SupabaseClient,
  rawCode: string | null | undefined
): Promise<TrialCodeLookup> {
  const code = normalizeTrialCode(rawCode)
  if (!code) return { kind: 'none' }

  const { data, error } = await supabase
    .from('trial_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('[trial-codes] lookup error:', error)
    return { kind: 'none' }
  }
  if (!data) return { kind: 'none' }

  const row = data as TrialCode
  const status = getTrialCodeStatus(row)
  if (status === 'available') return { kind: 'valid', code: row }
  return { kind: 'invalid', status, code: row }
}

export function trialCodeErrorMessage(
  status: Exclude<TrialCodeStatus, 'available'>,
  code?: Pick<TrialCode, 'max_uses'>
): string {
  if (status === 'expired') return 'This trial code has expired.'
  return code?.max_uses === 1
    ? 'This trial code has already been used.'
    : 'This trial code has reached its limit.'
}

/**
 * Claim one use of a code. The count check and the increment happen inside a
 * single statement in Postgres, so concurrent signups on a shared campaign
 * link can never push a code past its cap.
 */
export async function redeemTrialCode(
  supabase: SupabaseClient,
  id: string,
  redemption: { studioId: string; email: string | null }
): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_trial_code', {
    p_code_id: id,
    p_studio_id: redemption.studioId,
    p_email: redemption.email,
  })

  if (error) {
    console.error('[trial-codes] claim error:', error)
    return false
  }
  return data === true
}

/** Hand a use back when the signup that claimed it is rolled back. */
export async function releaseTrialCode(
  supabase: SupabaseClient,
  id: string,
  studioId: string | null = null
): Promise<void> {
  const { error } = await supabase.rpc('release_trial_code', {
    p_code_id: id,
    p_studio_id: studioId,
  })
  if (error) console.error('[trial-codes] release error:', error)
}

export function trialEndsAtFromDays(trialDays: number): string {
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
}

import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TrialCode } from '@/types/database'

import { DEFAULT_TRIAL_DAYS } from '@/lib/trial-code-format'

export { DEFAULT_TRIAL_DAYS }
export const MAX_TRIAL_DAYS = 365

// No 0/O/1/I so codes survive being read aloud or retyped from a screenshot.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

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

export type TrialCodeStatus = 'available' | 'redeemed' | 'expired'

export function getTrialCodeStatus(code: Pick<TrialCode, 'redeemed_at' | 'expires_at'>, now = Date.now()): TrialCodeStatus {
  if (code.redeemed_at) return 'redeemed'
  if (code.expires_at && new Date(code.expires_at).getTime() < now) return 'expired'
  return 'available'
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

export function trialCodeErrorMessage(status: Exclude<TrialCodeStatus, 'available'>): string {
  return status === 'redeemed'
    ? 'This trial code has already been used.'
    : 'This trial code has expired.'
}

/**
 * Atomically mark a code as used. Returns false if another signup got there
 * first — the WHERE on redeemed_at IS NULL is what makes codes single-use.
 */
export async function redeemTrialCode(
  supabase: SupabaseClient,
  id: string,
  redemption: { studioId: string; email: string | null }
): Promise<boolean> {
  const { data, error } = await supabase
    .from('trial_codes')
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_by_studio_id: redemption.studioId,
      redeemed_email: redemption.email,
    })
    .eq('id', id)
    .is('redeemed_at', null)
    .select('id')

  if (error) {
    console.error('[trial-codes] redeem error:', error)
    return false
  }
  return (data?.length ?? 0) > 0
}

/** Undo a redemption when the signup it belonged to is rolled back. */
export async function releaseTrialCode(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('trial_codes')
    .update({ redeemed_at: null, redeemed_by_studio_id: null, redeemed_email: null })
    .eq('id', id)
  if (error) console.error('[trial-codes] release error:', error)
}

export function trialEndsAtFromDays(trialDays: number): string {
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
}

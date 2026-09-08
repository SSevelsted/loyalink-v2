// Client-safe helpers shared by the signup pages and the server-side trial
// code service. Keep this file free of Node-only imports.

/** Trial length for self-signups without a trial code. */
export const DEFAULT_TRIAL_DAYS = 14

const TRIAL_CODE_PATTERN = /^TRIAL(\d{1,3})-[A-Z0-9]+$/

/**
 * Best-effort trial length from a code's prefix (TRIAL45-XXXXXX → 45) so the
 * form can show the right copy before the server has validated the code. The
 * server response is always the source of truth.
 */
export function trialDaysHint(code: string | null | undefined): number | null {
  const match = TRIAL_CODE_PATTERN.exec((code ?? '').trim().toUpperCase())
  return match ? Number(match[1]) : null
}

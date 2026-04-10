import crypto from 'crypto'

/**
 * Verify the cron secret from the Authorization header using timing-safe comparison.
 */
export function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !authHeader) return false

  const expected = `Bearer ${secret}`

  // Both must be same byte-length for timingSafeEqual
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}

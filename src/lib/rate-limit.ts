const rateLimit = (options: { interval: number; uniqueTokenPerInterval: number }) => {
  const tokenCache = new Map<string, number[]>()

  return {
    check: (limit: number, token: string): { success: boolean; remaining: number } => {
      const now = Date.now()
      const windowStart = now - options.interval

      const timestamps = tokenCache.get(token) || []
      const valid = timestamps.filter((t) => t > windowStart)

      if (valid.length >= limit) {
        return { success: false, remaining: 0 }
      }

      valid.push(now)
      tokenCache.set(token, valid)

      // Evict oldest entries when cache exceeds max unique tokens
      if (tokenCache.size > options.uniqueTokenPerInterval) {
        const firstKey = tokenCache.keys().next().value
        if (firstKey) tokenCache.delete(firstKey)
      }

      return { success: true, remaining: limit - valid.length }
    },
  }
}

// Shared limiters for public API routes
export const joinLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 })
export const signupLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 })
export const resendPassLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 })
export const referralLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 })

// Per-API-key limiter for authenticated API routes (100 req/min per key)
export const apiKeyLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 1000 })

export function getIP(request: Request): string {
  // Prefer Vercel's trusted header, fall back to x-forwarded-for
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

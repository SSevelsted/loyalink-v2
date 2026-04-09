import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-keys'
import { createEmbedToken } from '@/lib/embed-access'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const body = await request.json().catch(() => ({}))
    const ttl = Math.min(Number(body.ttl_seconds || 3600), 86400) // Max 24h

    const token = createEmbedToken(auth.studioId, ttl)

    return apiSuccess({
      token,
      expires_in: ttl,
      embed_url: `/embed/${auth.studioId}?token=${token}`,
    })
  } catch {
    return apiError('Internal server error', 500)
  }
}

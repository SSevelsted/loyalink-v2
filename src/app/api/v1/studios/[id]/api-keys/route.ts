import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey, generateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

/**
 * POST /api/v1/studios/:id/api-keys
 * Creates an API key for a studio. Requires master key authentication.
 * Returns the raw key ONCE — it cannot be retrieved again.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studioId } = await params
    const auth = await validateApiKey(request)
    if (!auth || auth.keyId !== 'master') {
      return apiError('Unauthorized — master API key required', 401)
    }

    // Verify studio exists
    const { data: studio } = await adminSupabase
      .from('studios')
      .select('id')
      .eq('id', studioId)
      .single()

    if (!studio) return apiError('Studio not found', 404)

    const body = await request.json().catch(() => ({}))
    const name = (body as Record<string, unknown>).name?.toString().trim() || 'StreamInk Integration'

    const { raw, hash } = generateApiKey()

    const { error } = await adminSupabase
      .from('api_keys')
      .insert({
        studio_id: studioId,
        key_hash: hash,
        name,
      })

    if (error) return apiError(error.message, 500)

    return apiSuccess({ key: raw, name }, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}

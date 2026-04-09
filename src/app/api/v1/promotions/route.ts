import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { data, error } = await adminSupabase
      .from('promotions')
      .select('*')
      .eq('studio_id', auth.studioId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) return apiError(error.message, 500)
    return apiSuccess(data ?? [])
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { name, type, cashback_rate, tier_slug, duration_type, duration_value } = await request.json()

    if (!name || !type || !duration_type) {
      return apiError('name, type, and duration_type are required', 400)
    }

    if (type === 'cashback_boost' && cashback_rate == null) {
      return apiError('cashback_rate required for cashback_boost', 400)
    }
    if (type === 'tier_override' && !tier_slug) {
      return apiError('tier_slug required for tier_override', 400)
    }

    const { data, error } = await adminSupabase
      .from('promotions')
      .insert({
        studio_id: auth.studioId,
        name,
        type,
        cashback_rate: type === 'cashback_boost' ? cashback_rate : null,
        tier_slug: type === 'tier_override' ? tier_slug : null,
        duration_type,
        duration_value: duration_value ?? 1,
      })
      .select()
      .single()

    if (error) return apiError(error.message, 500)
    return apiSuccess(data, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}

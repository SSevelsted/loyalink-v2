import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const q = request.nextUrl.searchParams.get('q')
    if (!q || q.length < 2) {
      return apiError('Query param "q" must be at least 2 characters', 400)
    }

    const { data, error } = await adminSupabase
      .from('customers')
      .select('id, name, email, phone, balance, loyalty_stage, has_purchased')
      .eq('studio_id', auth.studioId)
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20)

    if (error) return apiError(error.message, 500)

    return apiSuccess(data ?? [])
  } catch {
    return apiError('Internal server error', 500)
  }
}

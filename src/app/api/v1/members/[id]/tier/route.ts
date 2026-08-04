import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'
import { changeTier, MemberAdminError } from '@/lib/services/member-admin-service'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { tier_slug, cashback_rate } = await request.json()

    const result = await changeTier({
      studioId: auth.studioId,
      customerId: id,
      tierSlug: tier_slug,
      cashbackRate: cashback_rate,
      source: 'api',
    })

    return apiSuccess(result)
  } catch (err) {
    if (err instanceof MemberAdminError) return apiError(err.message, err.status)
    return apiError('Internal server error', 500)
  }
}

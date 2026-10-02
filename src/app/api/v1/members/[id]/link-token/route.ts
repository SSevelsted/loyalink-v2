import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-keys'
import { apiError, apiSuccess } from '@/lib/api-response'
import { MemberLinkError, rotateMemberLink } from '@/lib/services/member-link-service'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/members/{id}/link-token
 * Revoke the member's current link (every invite_link and pass back-field
 * link sent so far shows the public view) and return the new invite_link.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)
    return apiSuccess(await rotateMemberLink(auth.studioId, id))
  } catch (err) {
    if (err instanceof MemberLinkError) return apiError(err.message, err.status)
    return apiError('Internal server error', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-keys'
import { apiError, apiSuccess } from '@/lib/api-response'
import { attachReferral, AttachReferralError } from '@/lib/services/referral-attach-service'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/members/{id}/referral  { referral_code }
 * Attach a referrer to an existing member with no referrer yet.
 * 201 created, 200 when the same referrer is already attached.
 * No welcome bonus, no tier change, no webhook (see referral-attach-service).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const body = await request.json().catch(() => null)
    const result = await attachReferral({
      studioId: auth.studioId,
      customerId: id,
      referralCode: body?.referral_code,
    })
    return apiSuccess(result, result.created ? 201 : 200)
  } catch (err) {
    if (err instanceof AttachReferralError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    return apiError('Internal server error', 500)
  }
}

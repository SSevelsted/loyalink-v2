import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'
import { applyPromotion, revokePromotion, PromotionError } from '@/lib/services/promotion-service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { data, error } = await adminSupabase
      .from('member_promotions')
      .select('*, promotions(name)')
      .eq('customer_id', id)
      .eq('studio_id', auth.studioId)
      .order('created_at', { ascending: false })

    if (error) return apiError(error.message, 500)
    return apiSuccess(data ?? [])
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { promotion_id, type, cashback_rate, tier_slug, duration_type, duration_value } = body

    // If promotion_id provided, fetch template
    let promoType = type
    let promoCashbackRate = cashback_rate
    let promoTierSlug = tier_slug
    let promoDurationType = duration_type
    let promoDurationValue = duration_value

    if (promotion_id) {
      const { data: template } = await adminSupabase
        .from('promotions')
        .select('*')
        .eq('id', promotion_id)
        .eq('studio_id', auth.studioId)
        .single()

      if (!template) return apiError('Promotion template not found', 404)

      promoType = template.type
      promoCashbackRate = template.cashback_rate
      promoTierSlug = template.tier_slug
      promoDurationType = template.duration_type
      promoDurationValue = template.duration_value
    }

    if (!promoType || !promoDurationType) {
      return apiError('type and duration_type required (or provide promotion_id)', 400)
    }

    const result = await applyPromotion({
      studioId: auth.studioId,
      customerId: id,
      promotionId: promotion_id,
      type: promoType,
      cashbackRate: promoCashbackRate,
      tierSlug: promoTierSlug,
      durationType: promoDurationType,
      durationValue: promoDurationValue ?? 1,
      appliedBy: 'api',
    })

    return apiSuccess(result, 201)
  } catch (err) {
    if (err instanceof PromotionError) {
      return apiError(err.message, err.status)
    }
    return apiError('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    // Find active promotion for this member
    const { data: activePromo } = await adminSupabase
      .from('member_promotions')
      .select('id')
      .eq('customer_id', id)
      .eq('studio_id', auth.studioId)
      .eq('status', 'active')
      .single()

    if (!activePromo) return apiError('No active promotion found', 404)

    const result = await revokePromotion(activePromo.id, auth.studioId)
    return apiSuccess(result)
  } catch (err) {
    if (err instanceof PromotionError) {
      return apiError(err.message, err.status)
    }
    return apiError('Internal server error', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'
import { applyPromotion, PromotionError } from '@/lib/services/promotion-service'

type Params = { params: Promise<{ id: string }> }

async function verifyAdmin(studioId: string) {
  const result = await verifyStudioAccess(studioId, { requireAdmin: true })
  if (!result.authorized) return { authorized: false as const, error: result.error, userId: '' }
  return { authorized: true as const, userId: result.userId, error: undefined }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const studioId = request.nextUrl.searchParams.get('studioId')
    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyAdmin(studioId)
    if (!auth.authorized) return auth.error

    const { data, error } = await adminSupabase
      .from('member_promotions')
      .select('*, promotions(name)')
      .eq('customer_id', id)
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { studioId, promotion_id, type, cashback_rate, tier_slug, duration_type, duration_value } = body

    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyAdmin(studioId)
    if (!auth.authorized) return auth.error

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
        .eq('studio_id', studioId)
        .single()

      if (!template) return NextResponse.json({ error: 'Promotion template not found' }, { status: 404 })

      promoType = template.type
      promoCashbackRate = template.cashback_rate
      promoTierSlug = template.tier_slug
      promoDurationType = template.duration_type
      promoDurationValue = template.duration_value
    }

    if (!promoType || !promoDurationType) {
      return NextResponse.json({ error: 'type and duration_type required' }, { status: 400 })
    }

    const result = await applyPromotion({
      studioId,
      customerId: id,
      promotionId: promotion_id,
      type: promoType,
      cashbackRate: promoCashbackRate,
      tierSlug: promoTierSlug,
      durationType: promoDurationType,
      durationValue: promoDurationValue ?? 1,
      appliedBy: auth.userId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof PromotionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

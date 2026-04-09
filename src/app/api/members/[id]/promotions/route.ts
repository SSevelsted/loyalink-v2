import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'
import { applyPromotion, PromotionError } from '@/lib/services/promotion-service'

type Params = { params: Promise<{ id: string }> }

async function verifyAdmin(studioId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { authorized: false as const, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), userId: '' }

  const { data: membership } = await adminSupabase
    .from('studio_members')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { authorized: false as const, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), userId: '' }
  }
  return { authorized: true as const, userId: user.id, error: undefined }
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

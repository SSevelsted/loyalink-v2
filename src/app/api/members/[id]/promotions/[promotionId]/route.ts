import { NextRequest, NextResponse } from 'next/server'
import { verifyStudioAccess } from '@/lib/studio-access'
import { revokePromotion, PromotionError } from '@/lib/services/promotion-service'

type Params = { params: Promise<{ id: string; promotionId: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { promotionId } = await params
    const studioId = request.nextUrl.searchParams.get('studioId')
    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyStudioAccess(studioId, { requireAdmin: true })
    if (!auth.authorized) return auth.error

    const result = await revokePromotion(promotionId, studioId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof PromotionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

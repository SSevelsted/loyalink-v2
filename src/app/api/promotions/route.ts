import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'

async function verifyAdmin(studioId: string) {
  const result = await verifyStudioAccess(studioId, { requireAdmin: true })
  if (!result.authorized) return { authorized: false as const, error: result.error }
  return { authorized: true as const, userId: result.userId }
}

export async function GET(request: NextRequest) {
  try {
    const studioId = request.nextUrl.searchParams.get('studioId')
    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyAdmin(studioId)
    if (!auth.authorized) return auth.error

    const { data, error } = await adminSupabase
      .from('promotions')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studioId, name, type, cashback_rate, tier_slug, duration_type, duration_value } = body

    if (!studioId || !name || !type || !duration_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await verifyAdmin(studioId)
    if (!auth.authorized) return auth.error

    if (type === 'cashback_boost' && cashback_rate == null) {
      return NextResponse.json({ error: 'cashback_rate required for cashback_boost' }, { status: 400 })
    }
    if (type === 'tier_override' && !tier_slug) {
      return NextResponse.json({ error: 'tier_slug required for tier_override' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('promotions')
      .insert({
        studio_id: studioId,
        name,
        type,
        cashback_rate: type === 'cashback_boost' ? cashback_rate : null,
        tier_slug: type === 'tier_override' ? tier_slug : null,
        duration_type,
        duration_value: duration_value ?? 1,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

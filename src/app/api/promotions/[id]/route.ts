import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'

type Params = { params: Promise<{ id: string }> }

async function verifyAdmin(studioId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { authorized: false as const, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: membership } = await adminSupabase
    .from('studio_members')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { authorized: false as const, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { authorized: true as const }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { studioId, name, is_active, cashback_rate, tier_slug, duration_type, duration_value } = body

    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyAdmin(studioId)
    if (!auth.authorized) return auth.error

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (is_active !== undefined) updates.is_active = is_active
    if (cashback_rate !== undefined) updates.cashback_rate = cashback_rate
    if (tier_slug !== undefined) updates.tier_slug = tier_slug
    if (duration_type !== undefined) updates.duration_type = duration_type
    if (duration_value !== undefined) updates.duration_value = duration_value

    const { data, error } = await adminSupabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .eq('studio_id', studioId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const studioId = request.nextUrl.searchParams.get('studioId')
    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyAdmin(studioId)
    if (!auth.authorized) return auth.error

    const { error } = await adminSupabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .eq('studio_id', studioId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

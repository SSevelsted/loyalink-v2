import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'

async function getAuthedStudioId(request: NextRequest): Promise<{ studioId: string; error?: never } | { studioId?: never; error: NextResponse }> {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const studioId = request.nextUrl.searchParams.get('studioId')
  if (!studioId) return { error: NextResponse.json({ error: 'studioId required' }, { status: 400 }) }

  const { data: membership } = await adminSupabase
    .from('studio_members')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { studioId }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const auth = await getAuthedStudioId(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.url !== undefined) {
      const url = body.url?.trim()
      if (!url) return NextResponse.json({ error: 'url cannot be empty' }, { status: 400 })
      try { new URL(url) } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }) }
      if (!url.startsWith('https://')) return NextResponse.json({ error: 'URL must use HTTPS' }, { status: 400 })
      updates.url = url
    }

    if (body.events !== undefined) updates.events = body.events
    if (body.active !== undefined) updates.active = body.active

    const { data, error } = await adminSupabase
      .from('studio_webhooks')
      .update(updates)
      .eq('id', id)
      .eq('studio_id', auth.studioId)
      .select('id, url, events, active, created_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const auth = await getAuthedStudioId(request)
    if (auth.error) return auth.error

    const { error } = await adminSupabase
      .from('studio_webhooks')
      .delete()
      .eq('id', id)
      .eq('studio_id', auth.studioId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

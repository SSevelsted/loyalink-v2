import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'
import { auditLog } from '@/lib/audit-log'

async function getAuthedStudioId(request: NextRequest): Promise<{ studioId: string; error?: never } | { studioId?: never; error: NextResponse }> {
  const body = request.method === 'POST' ? await request.clone().json() : null
  const studioId = body?.studioId || request.nextUrl.searchParams.get('studioId')
  if (!studioId) return { error: NextResponse.json({ error: 'studioId required' }, { status: 400 }) }

  const result = await verifyStudioAccess(studioId, { requireAdmin: true })
  if (!result.authorized) return { error: result.error }
  return { studioId }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthedStudioId(request)
    if (auth.error) return auth.error

    const { data, error } = await adminSupabase
      .from('studio_webhooks')
      .select('id, url, events, active, created_at, updated_at')
      .eq('studio_id', auth.studioId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthedStudioId(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const url = body.url?.trim()
    const events = body.events ?? []

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'URL must use HTTPS' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('studio_webhooks')
      .insert({
        studio_id: auth.studioId,
        url,
        events,
      })
      .select('id, url, events, active, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    void auditLog({
      action: 'webhook.created',
      studioId: auth.studioId,
      actorId: user?.id ?? null,
      actorType: 'user',
      targetType: 'webhook',
      targetId: data.id,
      metadata: { url, events },
    })

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

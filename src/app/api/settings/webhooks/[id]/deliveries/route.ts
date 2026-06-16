import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const studioId = request.nextUrl.searchParams.get('studioId')
    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyStudioAccess(studioId, { requireAdmin: true })
    if (!auth.authorized) return auth.error

    // Verify ownership
    const { data: webhook } = await adminSupabase
      .from('studio_webhooks')
      .select('id')
      .eq('id', id)
      .eq('studio_id', studioId)
      .single()

    if (!webhook) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await adminSupabase
      .from('webhook_deliveries')
      .select('id, event, status_code, response_body, success, attempt, created_at')
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

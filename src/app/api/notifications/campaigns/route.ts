import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifyStudioAccess } from '@/lib/studio-access'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyStudioMember(studioId: string) {
  const result = await verifyStudioAccess(studioId)
  if (!result.authorized) return { authorized: false as const, error: result.error }
  return { authorized: true as const, userId: result.userId }
}

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  if (!studioId) return NextResponse.json({ error: 'studioId is required' }, { status: 400 })

  const auth = await verifyStudioMember(studioId)
  if (!auth.authorized) return auth.error

  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('push_campaigns')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studioId, name, audienceType, audienceFilter, content, scheduledAt } = body

    if (!studioId || !name) {
      return NextResponse.json({ error: 'studioId and name are required' }, { status: 400 })
    }

    const auth = await verifyStudioMember(studioId)
    if (!auth.authorized) return auth.error

    const status = scheduledAt ? 'scheduled' : 'draft'

    const { data, error } = await supabase
      .from('push_campaigns')
      .insert({
        studio_id: studioId,
        name,
        audience_type: audienceType || 'all',
        audience_filter: audienceFilter || {},
        content: content || {},
        scheduled_at: scheduledAt || null,
        status,
        created_by: auth.userId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

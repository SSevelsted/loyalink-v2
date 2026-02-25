import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyStudioMember(studioId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { authorized: false as const, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return { authorized: false as const, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { authorized: true as const, userId: user.id }
}

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  if (!studioId) return NextResponse.json({ error: 'studioId is required' }, { status: 400 })

  const auth = await verifyStudioMember(studioId)
  if (!auth.authorized) return auth.error

  const { data, error } = await supabase
    .from('push_automations')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studioId, name, triggerType, triggerConfig, content, audienceFilter } = body

    if (!studioId || !name || !triggerType) {
      return NextResponse.json({ error: 'studioId, name, and triggerType are required' }, { status: 400 })
    }

    const auth = await verifyStudioMember(studioId)
    if (!auth.authorized) return auth.error

    const { data, error } = await supabase
      .from('push_automations')
      .insert({
        studio_id: studioId,
        name,
        trigger_type: triggerType,
        trigger_config: triggerConfig || {},
        content: content || {},
        audience_filter: audienceFilter || {},
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

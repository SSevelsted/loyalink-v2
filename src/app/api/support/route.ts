import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  return user
}

async function isSuperAdmin(userId: string) {
  const { data } = await supabase
    .from('studio_members')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .limit(1)
    .single()
  return !!data
}

async function verifyStudioMember(studioId: string, userId: string) {
  const { data } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const all = searchParams.get('all')
  const studioId = searchParams.get('studioId')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')

  // Admin mode: return all tickets across studios
  if (all === 'true') {
    const admin = await isSuperAdmin(user.id)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let query = supabase
      .from('support_tickets')
      .select('*, studios(name)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (studioId) query = query.eq('studio_id', studioId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Studio mode
  if (!studioId) return NextResponse.json({ error: 'studioId is required' }, { status: 400 })

  const isMember = await verifyStudioMember(studioId, user.id)
  const admin = await isSuperAdmin(user.id)
  if (!isMember && !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let query = supabase
    .from('support_tickets')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { studioId, title, description, category, priority, attachmentUrl } = body

    if (!studioId || !title || !description) {
      return NextResponse.json({ error: 'studioId, title, and description are required' }, { status: 400 })
    }

    const isMember = await verifyStudioMember(studioId, user.id)
    const admin = await isSuperAdmin(user.id)
    if (!isMember && !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        studio_id: studioId,
        created_by: user.id,
        title,
        description,
        category: category || 'question',
        priority: priority || 'medium',
        attachment_url: attachmentUrl || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

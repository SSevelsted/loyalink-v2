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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ticket exists and user has access
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('studio_id')
    .eq('id', id)
    .single()

  if (ticketError || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMember = await verifyStudioMember(ticket.studio_id, user.id)
  const admin = await isSuperAdmin(user.id)
  if (!isMember && !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let query = supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  // Non-admins don't see internal notes
  if (!admin) {
    query = query.eq('is_internal', false)
  }

  const { data: messages, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve sender emails
  const senderIds = [...new Set(messages.map((m) => m.sender_id))]
  const senderMap = new Map<string, string>()

  for (const senderId of senderIds) {
    const { data: { user: senderUser } } = await supabase.auth.admin.getUserById(senderId)
    if (senderUser) {
      senderMap.set(senderId, senderUser.email ?? 'Unknown')
    }
  }

  const enriched = messages.map((m) => ({
    ...m,
    sender_email: senderMap.get(m.sender_id) ?? 'Unknown',
  }))

  return NextResponse.json(enriched)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('studio_id')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isMember = await verifyStudioMember(ticket.studio_id, user.id)
    const admin = await isSuperAdmin(user.id)
    if (!isMember && !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { message, isInternal } = body

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Only admins can create internal notes
    const internal = admin && isInternal === true

    const { data, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: id,
        sender_id: user.id,
        message,
        is_internal: internal,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Touch ticket updated_at
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

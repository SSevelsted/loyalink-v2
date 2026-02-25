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

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('*, studios(name)')
    .eq('id', id)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMember = await verifyStudioMember(ticket.studio_id, user.id)
  const admin = await isSuperAdmin(user.id)
  if (!isMember && !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(ticket)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: ticket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('studio_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isMember = await verifyStudioMember(ticket.studio_id, user.id)
    const admin = await isSuperAdmin(user.id)
    if (!isMember && !admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()

    // Non-admins: allow editing own ticket fields and closing
    if (!admin) {
      const isOwn = ticket.studio_id && true // already verified studio member above
      const updates: Record<string, unknown> = {}

      // Allow editing content fields when ticket is not resolved/closed
      const canEdit = ticket.status !== 'resolved' && ticket.status !== 'closed'
      if (canEdit) {
        if (body.title) updates.title = body.title
        if (body.description) updates.description = body.description
        if (body.category) updates.category = body.category
        if (body.priority) updates.priority = body.priority
      }

      // Allow closing their own ticket
      if (body.status === 'closed') {
        updates.status = 'closed'
        updates.resolved_at = new Date().toISOString()
      } else if (body.status && body.status !== 'closed') {
        return NextResponse.json({ error: 'You can only close tickets' }, { status: 403 })
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
      }
      void isOwn
      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    // Admin can update status, priority, assigned_to
    const updates: Record<string, unknown> = {}
    if (body.status) updates.status = body.status
    if (body.priority) updates.priority = body.priority
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to

    // Set resolved_at when moving to resolved or closed
    if (body.status === 'resolved' || body.status === 'closed') {
      updates.resolved_at = new Date().toISOString()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

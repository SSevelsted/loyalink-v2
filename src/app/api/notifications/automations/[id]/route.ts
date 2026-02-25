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
  return { authorized: true as const }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data: automation, error: fetchError } = await supabase
      .from('push_automations')
      .select('studio_id')
      .eq('id', id)
      .single()

    if (fetchError || !automation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const auth = await verifyStudioMember(automation.studio_id)
    if (!auth.authorized) return auth.error

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { studioId: _studioId, ...updates } = body

    const { data, error } = await supabase
      .from('push_automations')
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: automation, error: fetchError } = await supabase
    .from('push_automations')
    .select('studio_id')
    .eq('id', id)
    .single()

  if (fetchError || !automation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const auth = await verifyStudioMember(automation.studio_id)
  if (!auth.authorized) return auth.error

  const { error } = await supabase
    .from('push_automations')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getStudioId(studioId: string): Promise<{ studioId: string | null; error?: NextResponse }> {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()

  if (!user) {
    return { studioId: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio_id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { studioId: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { studioId: membership.studio_id }
}

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  if (!studioId) {
    return NextResponse.json({ error: 'studioId is required' }, { status: 400 })
  }

  const auth = await getStudioId(studioId)
  if (!auth.studioId) return auth.error!

  const { count, data, error } = await supabase
    .from('studio_pre_existing_clients')
    .select('created_at', { count: 'exact' })
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    count: count ?? 0,
    updatedAt: data?.[0]?.created_at ?? null,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { studioId, records } = await request.json() as {
      studioId: string
      records: { name?: string; email?: string; phone?: string }[]
    }

    if (!studioId || !Array.isArray(records)) {
      return NextResponse.json({ error: 'studioId and records are required' }, { status: 400 })
    }

    if (records.length > 10000) {
      return NextResponse.json({ error: 'Maximum 10,000 records per upload' }, { status: 400 })
    }

    const auth = await getStudioId(studioId)
    if (!auth.studioId) return auth.error!

    // Validate records
    const valid = records.filter(r => r.email || r.phone)
    if (valid.length === 0) {
      return NextResponse.json({ error: 'No valid records (each row needs email or phone)' }, { status: 400 })
    }

    // Full replace: delete existing then insert
    const { error: deleteError } = await supabase
      .from('studio_pre_existing_clients')
      .delete()
      .eq('studio_id', studioId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const { error: insertError } = await supabase
      .from('studio_pre_existing_clients')
      .insert(
        valid.map(r => ({
          studio_id: studioId,
          name: r.name || null,
          email: r.email || null,
          phone: r.phone || null,
        }))
      )

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ count: valid.length })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  if (!studioId) {
    return NextResponse.json({ error: 'studioId is required' }, { status: 400 })
  }

  const auth = await getStudioId(studioId)
  if (!auth.studioId) return auth.error!

  const { error } = await supabase
    .from('studio_pre_existing_clients')
    .delete()
    .eq('studio_id', studioId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

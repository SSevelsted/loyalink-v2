import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'
import { generateApiKey } from '@/lib/api-keys'
import { auditLog } from '@/lib/audit-log'

async function getAuthedStudioId(request: NextRequest): Promise<{ studioId: string; error?: never } | { studioId?: never; error: NextResponse }> {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body = ['POST', 'PATCH'].includes(request.method) ? await request.clone().json() : null
  const studioId = body?.studioId || request.nextUrl.searchParams.get('studioId')
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

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthedStudioId(request)
    if (auth.error) return auth.error

    const { data, error } = await adminSupabase
      .from('api_keys')
      .select('id, name, created_at, last_used_at, revoked_at')
      .eq('studio_id', auth.studioId)
      .is('revoked_at', null)
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
    const name = body.name?.trim() || 'Default'

    const { raw, hash } = generateApiKey()

    const { error } = await adminSupabase
      .from('api_keys')
      .insert({
        studio_id: auth.studioId,
        key_hash: hash,
        name,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    void auditLog({
      action: 'api_key.created',
      studioId: auth.studioId,
      actorId: user?.id ?? null,
      actorType: 'user',
      targetType: 'api_key',
      metadata: { name },
    })

    // Return the raw key ONCE — it cannot be retrieved again
    return NextResponse.json({ key: raw, name }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthedStudioId(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const keyId = body.keyId
    if (!keyId) return NextResponse.json({ error: 'keyId required' }, { status: 400 })

    // Verify the key belongs to this studio and is not revoked
    const { data: existing } = await adminSupabase
      .from('api_keys')
      .select('id, name')
      .eq('id', keyId)
      .eq('studio_id', auth.studioId)
      .is('revoked_at', null)
      .single()

    if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 })

    // Generate a new key and replace the hash (revokes the old key)
    const { raw, hash } = generateApiKey()

    const { error } = await adminSupabase
      .from('api_keys')
      .update({ key_hash: hash })
      .eq('id', keyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    void auditLog({
      action: 'api_key.rotated',
      studioId: auth.studioId,
      actorId: user?.id ?? null,
      actorType: 'user',
      targetType: 'api_key',
      targetId: keyId,
      metadata: { name: existing.name },
    })

    // Return the new raw key ONCE — it cannot be retrieved again
    return NextResponse.json({ key: raw, name: existing.name })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

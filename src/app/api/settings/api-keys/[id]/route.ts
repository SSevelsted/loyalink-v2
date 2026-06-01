import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'
import { auditLog } from '@/lib/audit-log'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studioId = request.nextUrl.searchParams.get('studioId')
    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })

    const auth = await verifyStudioAccess(studioId, { requireAdmin: true })
    if (!auth.authorized) return auth.error

    const { error } = await adminSupabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('studio_id', studioId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    void auditLog({
      action: 'api_key.revoked',
      studioId,
      actorId: auth.userId,
      actorType: 'user',
      targetType: 'api_key',
      targetId: id,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

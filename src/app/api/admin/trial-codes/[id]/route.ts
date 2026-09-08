import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifySuperAdmin } from '@/lib/studio-access'

/** DELETE /api/admin/trial-codes/[id] — revoke an unused code. Redeemed codes are kept for attribution. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const { data, error } = await adminSupabase
    .from('trial_codes')
    .delete()
    .eq('id', id)
    .is('redeemed_at', null)
    .select('id')

  if (error) {
    console.error('[admin/trial-codes] delete error:', error)
    return NextResponse.json({ error: 'Failed to revoke trial code' }, { status: 500 })
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Code not found or already redeemed' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

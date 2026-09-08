import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifySuperAdmin } from '@/lib/studio-access'

/** DELETE /api/admin/trial-codes/[id] — revoke a code nobody has redeemed yet. */
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
    .eq('use_count', 0)
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

/**
 * PATCH /api/admin/trial-codes/[id]
 * Body: { maxUses?: number | null; expiresInDays?: number | null }
 *
 * Lets a live campaign code be capped, uncapped, or closed off without
 * reissuing the link that is already printed on a page.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const update: Record<string, unknown> = {}

  if ('maxUses' in body) {
    if (body.maxUses === null || body.maxUses === '') {
      update.max_uses = null
    } else {
      const parsed = Number(body.maxUses)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) {
        return NextResponse.json({ error: 'maxUses must be a whole number between 1 and 10000, or empty for unlimited' }, { status: 400 })
      }
      update.max_uses = parsed
    }
  }

  if ('expiresInDays' in body) {
    if (body.expiresInDays === null || body.expiresInDays === '') {
      update.expires_at = null
    } else {
      const parsed = Number(body.expiresInDays)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
        return NextResponse.json({ error: 'expiresInDays must be a whole number between 1 and 365' }, { status: 400 })
      }
      update.expires_at = new Date(Date.now() + parsed * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('trial_codes')
    .update(update)
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[admin/trial-codes] update error:', error)
    return NextResponse.json({ error: 'Failed to update trial code' }, { status: 500 })
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Code not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

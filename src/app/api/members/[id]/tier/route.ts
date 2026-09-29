import { NextRequest, NextResponse } from 'next/server'
import { verifyStudioAccess } from '@/lib/studio-access'
import { changeTier, MemberAdminError } from '@/lib/services/member-admin-service'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/members/[id]/tier — the dashboard "Change tier" dialog.
// Runs the same changeTier service as the v1 API and the embed, so a tier
// change during an active promotion becomes that promotion's fallback instead
// of being lost when it ends, and the tier_change event is always written.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { studioId, tierSlug } = body as { studioId?: string; tierSlug?: string }

    if (!studioId) return NextResponse.json({ error: 'studioId required' }, { status: 400 })
    if (!tierSlug) return NextResponse.json({ error: 'tierSlug required' }, { status: 400 })

    // Same gate as the dialog: owners, admins and super_admins only.
    const access = await verifyStudioAccess(studioId, { requireAdmin: true })
    if (!access.authorized) return access.error

    const result = await changeTier({
      studioId,
      customerId: id,
      tierSlug,
      source: 'dashboard',
      // The dashboard client calls /api/pass/push/customer itself, which also
      // syncs legacy PassKit cards.
      pushPass: false,
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof MemberAdminError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

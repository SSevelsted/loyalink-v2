import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Anon-key client for public read-only routes — respects RLS policies */
export const anonSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function isStudioMember(userId: string, studioId: string): Promise<boolean> {
  const { data } = await adminSupabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!data
}

export type StudioAccessResult =
  | {
      authorized: true
      userId: string
      role: 'owner' | 'admin' | 'member' | 'super_admin'
      isSuperAdmin: boolean
    }
  | {
      authorized: false
      error: NextResponse
    }

/**
 * Verify the current session user can access the given studio.
 * Returns authorized: true if the user is a member of the studio OR has the
 * super_admin role (granted on any studio_members row). Pass requireAdmin to
 * additionally require an owner/admin role (super_admin still satisfies this).
 */
export async function verifyStudioAccess(
  studioId: string,
  options: { requireAdmin?: boolean } = {},
): Promise<StudioAccessResult> {
  const user = await getSessionUser()
  if (!user) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: memberships } = await adminSupabase
    .from('studio_members')
    .select('studio_id, role')
    .eq('user_id', user.id)

  const rows = (memberships ?? []) as Array<{ studio_id: string; role: string }>
  const superAdminRow = rows.find((m) => m.role === 'super_admin')
  const studioMembership = rows.find((m) => m.studio_id === studioId)

  if (!studioMembership && !superAdminRow) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  const role = (superAdminRow ? 'super_admin' : studioMembership!.role) as
    | 'owner'
    | 'admin'
    | 'member'
    | 'super_admin'

  if (options.requireAdmin && !['owner', 'admin', 'super_admin'].includes(role)) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    authorized: true,
    userId: user.id,
    role,
    isSuperAdmin: !!superAdminRow,
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'

/**
 * Deletes the caller's account. Required by Apple guideline 5.1.1(v) and
 * analogous data-protection expectations elsewhere.
 *
 * Behaviour:
 *  - For every studio the caller is the sole `owner` of, the studio row is
 *    deleted. All studio-scoped tables cascade-delete.
 *  - The auth user row is deleted. Remaining studio_members rows (where the
 *    caller was only a member or one of several owners) cascade from that,
 *    preserving studios that still have other owners.
 *
 * Irreversible. Client must confirm before calling.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const userId = user.id

  // 1. Find every studio where the caller is an owner.
  const { data: ownerships, error: ownershipsError } = await adminSupabase
    .from('studio_members')
    .select('studio_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (ownershipsError) {
    return NextResponse.json({ error: ownershipsError.message }, { status: 500 })
  }

  // 2. For each, delete the studio only if the caller is the sole owner.
  for (const { studio_id } of ownerships ?? []) {
    const { count, error: countError } = await adminSupabase
      .from('studio_members')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studio_id)
      .eq('role', 'owner')

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    if ((count ?? 0) <= 1) {
      const { error: studioError } = await adminSupabase
        .from('studios')
        .delete()
        .eq('id', studio_id)

      if (studioError) {
        return NextResponse.json({ error: studioError.message }, { status: 500 })
      }
    }
  }

  // 3. Delete the auth user. Remaining memberships cascade.
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

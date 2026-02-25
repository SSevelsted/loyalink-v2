import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Verify caller is super_admin
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all auth users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  // Fetch all studio memberships with studio names
  const { data: allMembers } = await supabase
    .from('studio_members')
    .select('user_id, studio_id, role, studios(name)')

  // Build a map: userId -> studio memberships
  const membershipMap = new Map<string, Array<{ studio_id: string; studio_name: string; role: string }>>()
  for (const m of allMembers ?? []) {
    const entry = {
      studio_id: m.studio_id,
      studio_name: (m.studios as unknown as { name: string } | null)?.name ?? 'Unknown',
      role: m.role,
    }
    const existing = membershipMap.get(m.user_id) ?? []
    existing.push(entry)
    membershipMap.set(m.user_id, existing)
  }

  const result = users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    studios: membershipMap.get(u.id) ?? [],
  }))

  return NextResponse.json(result)
}

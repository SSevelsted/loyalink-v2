import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

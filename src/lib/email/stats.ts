import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type StudioStats = {
  customerCount: number
  totalBalance: number
  transactionCount: number
}

export async function getStudioStats(studioId: string): Promise<StudioStats> {
  const [customersRes, balanceRes, txRes] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('studio_id', studioId),
    supabase.from('customers').select('balance').eq('studio_id', studioId),
    supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('studio_id', studioId),
  ])

  const totalBalance = (balanceRes.data ?? []).reduce((sum, c) => sum + Number(c.balance || 0), 0)

  return {
    customerCount: customersRes.count ?? 0,
    totalBalance: Math.round(totalBalance),
    transactionCount: txRes.count ?? 0,
  }
}

export async function getStudioOwner(studioId: string): Promise<{ email: string; name: string } | null> {
  const { data: ownerMember } = await supabase
    .from('studio_members')
    .select('user_id')
    .eq('studio_id', studioId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (!ownerMember) return null

  const { data: { user } } = await supabase.auth.admin.getUserById(ownerMember.user_id)
  if (!user?.email) return null

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0]
  return { email: user.email, name }
}

export async function hasPaymentMethod(studioId: string): Promise<boolean> {
  const { data: studio } = await supabase
    .from('studios')
    .select('stripe_customer_id')
    .eq('id', studioId)
    .single()

  if (!studio?.stripe_customer_id) return false

  try {
    const methods = await getStripe().customers.listPaymentMethods(
      studio.stripe_customer_id,
      { limit: 1 }
    )
    return methods.data.length > 0
  } catch {
    return false
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { PLATFORM_URL } from '@/lib/constants'

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's studio
  const { data: member } = await supabase
    .from('studio_members')
    .select('studio_id, studios(stripe_customer_id)')
    .eq('user_id', user.id)
    .not('role', 'eq', 'super_admin')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const studio = member?.studios as unknown as { stripe_customer_id: string | null } | null
  const customerId = studio?.stripe_customer_id

  if (!customerId) {
    return NextResponse.json(
      { error: 'No billing account found. Please contact support.' },
      { status: 400 }
    )
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${PLATFORM_URL}/settings`,
  })

  return NextResponse.json({ url: session.url })
}

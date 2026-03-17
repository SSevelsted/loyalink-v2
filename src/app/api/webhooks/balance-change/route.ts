import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { passServiceFetch } from '@/lib/pass-service'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Webhook called when a customer's balance changes
// Triggers a pass update push notification
export async function POST(request: NextRequest) {
  const { customerId, studioId } = await request.json()

  if (!customerId || !studioId) {
    return NextResponse.json({ error: 'Missing customerId or studioId' }, { status: 400 })
  }

  // Auth check
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Notify pass service to push update
    const res = await passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' })

    if (!res.ok) {
      console.error('Failed to send push:', await res.text())
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

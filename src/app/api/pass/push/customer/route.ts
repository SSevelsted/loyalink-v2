import { NextRequest, NextResponse } from 'next/server'
import { passServiceFetch } from '@/lib/pass-service'
import { adminSupabase, getSessionUser, isStudioMember } from '@/lib/studio-access'

export async function POST(request: NextRequest) {
  try {
    const { customerId } = await request.json() as { customerId?: string }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customer, error } = await adminSupabase
      .from('customers')
      .select('id, studio_id')
      .eq('id', customerId)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const member = await isStudioMember(user.id, customer.studio_id)
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const res = await passServiceFetch(`/api/push/customer/${customer.id}`, { method: 'POST' })
    const data = await res.json().catch(() => ({ error: 'Failed to send push' }))

    if (!res.ok) {
      return NextResponse.json(
        { error: typeof data?.error === 'string' ? data.error : 'Failed to send push' },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

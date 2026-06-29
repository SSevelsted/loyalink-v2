import { NextRequest, NextResponse } from 'next/server'
import { passServiceFetch } from '@/lib/pass-service'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'
import { syncLegacyPasskitCustomer } from '@/lib/services/legacy-passkit-sync-service'

export async function POST(request: NextRequest) {
  try {
    const { customerId } = await request.json() as { customerId?: string }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const { data: customer, error } = await adminSupabase
      .from('customers')
      .select('id, studio_id')
      .eq('id', customerId)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Grants access to studio members AND super_admins (who manage any studio).
    const access = await verifyStudioAccess(customer.studio_id)
    if (!access.authorized) {
      return access.error
    }

    const legacySync = await syncLegacyPasskitCustomer({ customerId: customer.id, studioId: customer.studio_id })
    const res = await passServiceFetch(`/api/push/customer/${customer.id}`, { method: 'POST' })
    const data = await res.json().catch(() => ({ error: 'Failed to send push' }))

    if (!res.ok) {
      return NextResponse.json(
        { error: typeof data?.error === 'string' ? data.error : 'Failed to send push' },
        { status: res.status }
      )
    }

    return NextResponse.json({ ...data, legacySync })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

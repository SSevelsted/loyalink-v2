import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, verifyCustomerAccessToken } from '@/lib/customer-access'
import { passServiceFetch } from '@/lib/pass-service'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const customerId = typeof body.customerId === 'string' ? body.customerId : null
    const platform = body.platform === 'google' ? 'google' : 'apple'

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const { data: customer, error: customerError } = await adminSupabase
      .from('customers')
      .select('id, studio_id')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const bearer = getBearerToken(request.headers.get('authorization'))
    const customerAccess = verifyCustomerAccessToken(bearer)

    // Customer self-service authenticates with an access token; staff use their
    // session. verifyStudioAccess honors super_admin (access to any studio),
    // matching the rest of the studio-scoped API routes (see PR #6).
    if (customerAccess?.customerId !== customer.id) {
      const access = await verifyStudioAccess(customer.studio_id)
      if (!access.authorized) {
        return access.error
      }
    }

    const passResponse = await passServiceFetch('/api/passes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: customer.id, platform }),
    })

    const data = await passResponse.json().catch(() => ({ error: 'Failed to generate pass' }))

    if (!passResponse.ok) {
      return NextResponse.json(
        { error: typeof data?.error === 'string' ? data.error : 'Failed to generate pass' },
        { status: passResponse.status }
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

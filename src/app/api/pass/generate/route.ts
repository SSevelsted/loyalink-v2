import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, verifyCustomerAccessToken } from '@/lib/customer-access'
import { passServiceFetch } from '@/lib/pass-service'
import { adminSupabase, getSessionUser, isStudioMember } from '@/lib/studio-access'

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

    let authorized = customerAccess?.customerId === customer.id

    if (!authorized) {
      const user = await getSessionUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      authorized = await isStudioMember(user.id, customer.studio_id)
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

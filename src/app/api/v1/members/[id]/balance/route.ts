import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'
import { passServiceFetch } from '@/lib/pass-service'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { type, amount, description } = await request.json()

    if (!type || !['credit', 'debit'].includes(type)) {
      return apiError('type must be "credit" or "debit"', 400)
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return apiError('amount must be a positive number', 400)
    }

    // Fetch customer
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('id, balance, studio_id')
      .eq('id', id)
      .eq('studio_id', auth.studioId)
      .single()

    if (!customer) return apiError('Member not found', 404)

    const balanceChange = type === 'credit' ? amount : -amount
    const newBalance = Number(customer.balance) + balanceChange

    if (newBalance < 0) {
      return apiError('Insufficient balance', 400)
    }

    // Create transaction
    await adminSupabase.from('transactions').insert({
      customer_id: id,
      studio_id: auth.studioId,
      type: type === 'credit' ? 'adjustment' : 'debit',
      amount: type === 'credit' ? amount : -amount,
      description: description || `API ${type}`,
      created_by: 'api',
    })

    // Update balance
    await adminSupabase
      .from('customers')
      .update({ balance: newBalance })
      .eq('id', id)

    // Trigger pass update
    void passServiceFetch(`/api/push/customer/${id}`, { method: 'POST' }).catch(() => {})

    return apiSuccess({ balance: newBalance })
  } catch {
    return apiError('Internal server error', 500)
  }
}

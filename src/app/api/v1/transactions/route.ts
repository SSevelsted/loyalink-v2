import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api-response'
import { processTransaction, TransactionError } from '@/lib/services/transaction-service'

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { customer_id, amount, cash_amount, is_deposit } = await request.json()

    if (!customer_id || amount == null) {
      return apiError('customer_id and amount are required', 400)
    }

    // Verify customer belongs to this studio
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .eq('studio_id', auth.studioId)
      .single()

    if (!customer) return apiError('Customer not found in this studio', 404)

    const result = await processTransaction({
      customerId: customer_id,
      studioId: auth.studioId,
      amount,
      cashAmount: cash_amount,
      isDeposit: is_deposit,
      createdBy: 'api',
    })

    return apiSuccess(result, 201)
  } catch (err) {
    if (err instanceof TransactionError) {
      return apiError(err.message, err.status)
    }
    return apiError('Internal server error', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
    const offset = Number(searchParams.get('offset') || 0)
    const customerId = searchParams.get('customer_id')
    const type = searchParams.get('type')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    let query = adminSupabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('studio_id', auth.studioId)

    if (customerId) query = query.eq('customer_id', customerId)
    if (type) query = query.eq('type', type)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) return apiError(error.message, 500)

    return apiPaginated(data ?? [], count ?? 0, limit, offset)
  } catch {
    return apiError('Internal server error', 500)
  }
}

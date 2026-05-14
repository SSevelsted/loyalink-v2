import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { verifyEmbedToken } from '@/lib/embed-access'
import { processTransaction, TransactionError } from '@/lib/services/transaction-service'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const studioId = searchParams.get('studioId')
  const token = searchParams.get('token')

  if (!studioId || !token) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const payload = verifyEmbedToken(token)
  if (!payload || payload.studioId !== studioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
  const offset = Number(searchParams.get('offset') || 0)
  const type = searchParams.get('type')

  let query = adminSupabase
    .from('transactions')
    .select('*, customers!inner(name)', { count: 'exact' })
    .eq('studio_id', studioId)

  if (type) query = query.eq('type', type)

  query = query.order('created_at', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0, limit, offset })
}

export async function POST(request: NextRequest) {
  try {
    const { studioId, token, customerId, amount, cashAmount, isDeposit, balanceUsed } = await request.json()

    if (!studioId || !token || !customerId || amount == null) {
      return NextResponse.json({ error: 'studioId, token, customerId, and amount are required' }, { status: 400 })
    }

    const payload = verifyEmbedToken(token)
    if (!payload || payload.studioId !== studioId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const numericAmount = Number(amount)
    const numericCashAmount = cashAmount == null ? numericAmount : Number(cashAmount)
    const numericBalanceUsed = Math.max(0, Number(balanceUsed ?? 0))
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    const { data: customer } = await adminSupabase
      .from('customers')
      .select('id, balance')
      .eq('id', customerId)
      .eq('studio_id', studioId)
      .single()

    if (!customer) return NextResponse.json({ error: 'Customer not found in this studio' }, { status: 404 })

    const currentBalance = Number(customer.balance ?? 0)
    const safeBalanceUsed = Math.min(currentBalance, numericAmount, numericBalanceUsed)
    if (safeBalanceUsed > 0) {
      const { error: debitErr } = await adminSupabase.from('transactions').insert({
        customer_id: customerId,
        studio_id: studioId,
        type: 'debit',
        amount: safeBalanceUsed,
        description: 'Loyalty balance redeemed',
      })
      if (debitErr) return NextResponse.json({ error: debitErr.message }, { status: 500 })

      await adminSupabase
        .from('customers')
        .update({ balance: currentBalance - safeBalanceUsed })
        .eq('id', customerId)
    }

    const { error: creditErr } = await adminSupabase.from('transactions').insert({
      customer_id: customerId,
      studio_id: studioId,
      type: 'credit',
      amount: numericAmount,
      description: isDeposit ? 'Deposit' : null,
    })
    if (creditErr) return NextResponse.json({ error: creditErr.message }, { status: 500 })

    const result = await processTransaction({
      customerId,
      studioId,
      amount: numericAmount,
      cashAmount: numericCashAmount,
      isDeposit,
      createdBy: 'embed',
    })

    return NextResponse.json({
      ...result,
      balanceUsed: safeBalanceUsed,
      chargeOnPOS: numericCashAmount,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof TransactionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

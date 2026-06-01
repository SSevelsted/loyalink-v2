import { NextRequest, NextResponse } from 'next/server'
import { verifyStudioAccess } from '@/lib/studio-access'
import { processTransaction, TransactionError } from '@/lib/services/transaction-service'

export async function POST(request: NextRequest) {
  try {
    const { customerId, studioId, amount, cashAmount, isDeposit } = await request.json()

    if (!customerId || !studioId || amount == null) {
      return NextResponse.json({ error: 'customerId, studioId, and amount are required' }, { status: 400 })
    }

    const auth = await verifyStudioAccess(studioId)
    if (!auth.authorized) return auth.error

    const result = await processTransaction({
      customerId,
      studioId,
      amount,
      cashAmount,
      isDeposit,
      createdBy: auth.userId,
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof TransactionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

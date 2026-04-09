import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'
import { processTransaction, TransactionError } from '@/lib/services/transaction-service'

export async function POST(request: NextRequest) {
  try {
    const { customerId, studioId, amount, cashAmount, isDeposit } = await request.json()

    if (!customerId || !studioId || amount == null) {
      return NextResponse.json({ error: 'customerId, studioId, and amount are required' }, { status: 400 })
    }

    // Auth check
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await adminSupabase
      .from('studio_members')
      .select('id')
      .eq('studio_id', studioId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await processTransaction({
      customerId,
      studioId,
      amount,
      cashAmount,
      isDeposit,
      createdBy: user.id,
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof TransactionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

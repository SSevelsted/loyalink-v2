import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendTransactionReceipt, type ReceiptData } from '@/lib/email/send'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const {
      customerId,
      studioId,
      amount,
      chargeOnPOS,
      balanceUsed,
      cashbackEarned,
      cashbackRate,
      newBalance,
      tierName,
      tierUpgraded,
      newTierName,
      newCashbackRate,
      nextTierName,
      nextTierRate,
      amountToNextTier,
    } = await request.json()

    if (!customerId || !studioId) {
      return NextResponse.json({ error: 'customerId and studioId are required' }, { status: 400 })
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

    const txData: ReceiptData = {
      amount,
      balanceUsed: balanceUsed ?? 0,
      chargeOnPOS: chargeOnPOS ?? null,
      cashbackEarned: cashbackEarned ?? 0,
      cashbackRate: cashbackRate ?? 0,
      newBalance: newBalance ?? 0,
      tierName: tierName ?? '',
      tierUpgraded: !!tierUpgraded,
      newTierName,
      newCashbackRate,
      nextTierName,
      nextTierRate,
      amountToNextTier,
    }

    await sendTransactionReceipt(customerId, studioId, txData)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send receipt' }, { status: 500 })
  }
}

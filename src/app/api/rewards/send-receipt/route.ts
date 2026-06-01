import { NextRequest, NextResponse } from 'next/server'
import { sendTransactionReceipt, type ReceiptData } from '@/lib/email/send'
import { verifyStudioAccess } from '@/lib/studio-access'

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

    const auth = await verifyStudioAccess(studioId)
    if (!auth.authorized) return auth.error

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

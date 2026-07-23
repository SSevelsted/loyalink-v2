'use client'

import { useParams } from 'next/navigation'
import { useCustomer } from '@/hooks/use-customers'
import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useProcessTransaction, useRewardsConfig } from '@/hooks/use-rewards'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ScanDialog } from '@/components/scanner/scan-dialog'
import { getTierDisplayName, getTierIndex, getEffectiveTierSlug } from '@/lib/format'
import { getCurrencyConfig } from '@/lib/currency'
import { DirectionalTransition } from '@/components/transitions/directional-transition'
import { RecordTransactionView, type RecordedTransaction } from '@/components/transaction/record-transaction-view'

export default function RecordTransactionPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: customer, isLoading } = useCustomer(id)
  const { currentStudio } = useStudio()
  const { data: rewardsConfig } = useRewardsConfig()
  const processTransaction = useProcessTransaction()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [showScanner, setShowScanner] = useState(false)

  const currencyConfig = getCurrencyConfig(
    (currentStudio?.settings?.currency as string) ?? 'kr'
  )

  if (isLoading || !customer) {
    return (
      <div className="max-w-sm mx-auto pt-10 space-y-4">
        <div className="h-5 w-36 animate-shimmer rounded mx-auto" />
        <div className="h-32 animate-shimmer rounded-2xl" />
      </div>
    )
  }

  const currentBalance = Number(customer.balance ?? 0)
  const effectiveTierSlug = getEffectiveTierSlug(customer.loyalty_stage ?? '', rewardsConfig)
  const cashbackRate =
    rewardsConfig?.tiers.find((t) => t.slug === effectiveTierSlug)?.cashback_rate ??
    Number(customer.cashback_rate ?? 0)
  const tierName = getTierDisplayName(customer.loyalty_stage, rewardsConfig)
  const tierIndex = getTierIndex(customer.loyalty_stage, rewardsConfig)

  async function handleRecord(input: {
    amount: number
    chargeOnPOS: number
    balanceUsed: number
    isDeposit: boolean
    useBalance: boolean
  }) {
    if (!currentStudio || input.amount <= 0) throw new Error('Invalid amount')

    if (input.balanceUsed > 0) {
      const { error: debitErr } = await supabase.from('transactions').insert({
        customer_id: id,
        studio_id: currentStudio.id,
        type: 'debit',
        amount: input.balanceUsed,
        description: 'Loyalty balance redeemed',
      })
      if (debitErr) throw new Error(debitErr.message)
      await supabase.from('customers').update({ balance: currentBalance - input.balanceUsed }).eq('id', id)
    }

    const { error: creditErr } = await supabase.from('transactions').insert({
      customer_id: id,
      studio_id: currentStudio.id,
      type: 'credit',
      amount: input.amount,
      description: input.isDeposit ? 'Deposit' : null,
    })
    if (creditErr) throw new Error(creditErr.message)

    const result = await processTransaction.mutateAsync({
      customerId: id,
      studioId: currentStudio.id,
      transactionId: '',
      amount: input.amount,
      cashAmount: input.chargeOnPOS,
      isDeposit: input.isDeposit,
    })

    queryClient.invalidateQueries({ queryKey: ['transactions', id] })
    queryClient.invalidateQueries({ queryKey: ['all_transactions'] })
    queryClient.invalidateQueries({ queryKey: ['customer', id] })
    queryClient.invalidateQueries({ queryKey: ['customer_events', id] })

    return { summary: result?.summary ?? null }
  }

  async function handleSendReceipt(recorded: RecordedTransaction) {
    if (!currentStudio) return
    const s = recorded.summary
    const res = await fetch('/api/rewards/send-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: id,
        studioId: currentStudio.id,
        amount: recorded.amount,
        chargeOnPOS: recorded.chargeOnPOS,
        balanceUsed: recorded.balanceUsed,
        cashbackEarned: recorded.cashback,
        cashbackRate: s?.cashbackRate ?? cashbackRate,
        newBalance: recorded.newBalance,
        tierName: s?.currentTier.name ?? tierName,
        tierUpgraded: s?.tierUpgraded ?? false,
        newTierName: s?.tierUpgraded ? s.currentTier.name : null,
        currency: currencyConfig.symbol,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to send')
    }
  }

  return (
    <DirectionalTransition>
      <RecordTransactionView
        customer={{ name: customer.name, email: customer.email, phone: customer.phone }}
        currencyConfig={currencyConfig}
        cashbackRate={cashbackRate}
        currentBalance={currentBalance}
        tierName={tierName}
        tierIndex={tierIndex}
        onRecord={handleRecord}
        backSlot={
          <Link
            href={`/customers/${id}`}
            transitionTypes={['nav-back']}
            aria-label="Back to customer"
            className="h-11 w-11 -ml-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary active:bg-secondary active:scale-95 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
        onScanNext={() => setShowScanner(true)}
        secondarySuccessAction={
          <Button variant="ghost" className="w-full" asChild>
            <Link href={`/customers/${id}`}>Back to profile</Link>
          </Button>
        }
        onSendReceipt={handleSendReceipt}
      />
      <ScanDialog open={showScanner} onOpenChange={setShowScanner} />
    </DirectionalTransition>
  )
}

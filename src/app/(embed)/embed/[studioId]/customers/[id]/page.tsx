'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudio } from '@/hooks/use-studio'
import { getCurrencyConfig } from '@/lib/currency'
import { getTierDisplayName, getTierIndex } from '@/lib/format'
import { RecordTransactionView, type RecordTransactionSummary } from '@/components/transaction/record-transaction-view'

type Customer = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  balance: number | null
  loyalty_stage: string | null
  cashback_rate: number | null
  total_real_spend: number | null
}

export default function EmbedCustomerDetailPage() {
  const params = useParams<{ studioId: string; id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { currentStudio } = useStudio()
  const studioId = params.studioId
  const customerId = params.id

  const currencyConfig = getCurrencyConfig((currentStudio?.settings?.currency as string) ?? 'kr')
  const backHref = `/embed/${studioId}/customers?token=${token}`

  const { data, isLoading, error } = useQuery({
    queryKey: ['embed-customer', studioId, customerId],
    queryFn: async () => {
      const qp = new URLSearchParams({ studioId, token: token! })
      const res = await fetch(`/api/embed/customers/${customerId}?${qp}`)
      if (!res.ok) throw new Error('Failed to load customer')
      return res.json()
    },
    enabled: !!studioId && !!customerId && !!token,
  })

  const customer: Customer | null = data?.customer ?? null

  async function recordTransaction(input: {
    amount: number
    chargeOnPOS: number
    balanceUsed: number
    isDeposit: boolean
    useBalance: boolean
  }) {
    const res = await fetch('/api/embed/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioId,
        token,
        customerId,
        amount: input.amount,
        cashAmount: input.chargeOnPOS,
        balanceUsed: input.balanceUsed,
        isDeposit: input.isDeposit,
      }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(d.error ?? 'Could not record transaction')
    return { summary: (d.summary ?? null) as RecordTransactionSummary }
  }

  if (!token) {
    return (
      <div className="flex min-h-[640px] items-center justify-center text-sm text-muted-foreground">
        Missing embed access.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto pt-10 space-y-4">
        <div className="h-5 w-36 animate-pulse rounded bg-secondary/50 mx-auto" />
        <div className="h-32 animate-pulse rounded-2xl bg-secondary/50" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="max-w-sm mx-auto pt-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Button variant="secondary" asChild>
          <Link href={backHref}>Back to customers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-190px)] py-2">
      <RecordTransactionView
        customer={{ name: customer.name ?? 'Unnamed customer', email: customer.email, phone: customer.phone }}
        currencyConfig={currencyConfig}
        cashbackRate={Number(customer.cashback_rate ?? 0)}
        currentBalance={Number(customer.balance ?? 0)}
        tierName={getTierDisplayName(customer.loyalty_stage ?? '')}
        tierIndex={getTierIndex(customer.loyalty_stage ?? '')}
        onRecord={recordTransaction}
        backSlot={
          <Link
            href={backHref}
            aria-label="Back to customers"
            className="h-11 w-11 -ml-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
        secondarySuccessAction={
          <Button variant="ghost" className="w-full" asChild>
            <Link href={backHref}>Back to customers</Link>
          </Button>
        }
      />
    </div>
  )
}

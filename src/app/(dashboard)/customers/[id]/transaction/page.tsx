'use client'

import { useParams } from 'next/navigation'
import { useCustomer } from '@/hooks/use-customers'
import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useProcessTransaction, useRewardsConfig } from '@/hooks/use-rewards'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { getTierDisplayName, getTierIndex, getEffectiveTierSlug } from '@/lib/format'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { TIER_COLOR_PALETTE } from '@/types/database'

export default function RecordTransactionPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: customer, isLoading } = useCustomer(id)
  const { currentStudio } = useStudio()
  const { data: rewardsConfig } = useRewardsConfig()
  const processTransaction = useProcessTransaction()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const amountInputRef = useRef<HTMLInputElement>(null)

  const currencyConfig = getCurrencyConfig(
    (currentStudio?.settings?.currency as string) ?? 'kr'
  )

  const [amount, setAmount] = useState('')
  const [isDeposit, setIsDeposit] = useState(false)
  const [useBalance, setUseBalance] = useState(true)
  const [recorded, setRecorded] = useState<{ amount: number; cashback: number } | null>(null)

  const currentBalance = Number(customer?.balance ?? 0)
  const effectiveTierSlug = getEffectiveTierSlug(customer?.loyalty_stage ?? '', rewardsConfig)
  const cashbackRate =
    rewardsConfig?.tiers.find((t) => t.slug === effectiveTierSlug)?.cashback_rate ??
    Number(customer?.cashback_rate ?? 0)
  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0
  const balanceUsed = useBalance && !isDeposit ? Math.min(currentBalance, parsedAmount) : 0
  const chargeOnPOS = parsedAmount - balanceUsed
  const earnsNow = isDeposit ? 0 : parsedAmount * cashbackRate / 100
  const newBalanceAfter = currentBalance - balanceUsed + earnsNow

  const recordTransaction = useMutation({
    mutationFn: async () => {
      if (!currentStudio || parsedAmount <= 0) throw new Error('Invalid amount')

      if (balanceUsed > 0) {
        await supabase.from('transactions').insert({
          customer_id: id,
          studio_id: currentStudio.id,
          type: 'debit',
          amount: balanceUsed,
          description: 'Loyalty balance redeemed',
        })
        await supabase.from('customers').update({ balance: currentBalance - balanceUsed }).eq('id', id)
      }

      await supabase.from('transactions').insert({
        customer_id: id,
        studio_id: currentStudio.id,
        type: 'credit',
        amount: parsedAmount,
        description: isDeposit ? 'Consultation deposit' : null,
      })

      if (!isDeposit) {
        await processTransaction.mutateAsync({
          customerId: id,
          studioId: currentStudio.id,
          transactionId: '',
          amount: parsedAmount,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', id] })
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customer_events', id] })
      setRecorded({ amount: parsedAmount, cashback: earnsNow })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record transaction')
    },
  })

  const handleRecordAnother = () => {
    setRecorded(null)
    setAmount('')
    setIsDeposit(false)
    setUseBalance(true)
    setTimeout(() => amountInputRef.current?.focus(), 100)
  }

  if (isLoading || !customer) {
    return (
      <div className="max-w-sm mx-auto pt-10 space-y-4">
        <div className="h-5 w-36 animate-shimmer rounded mx-auto" />
        <div className="h-32 animate-shimmer rounded-2xl" />
      </div>
    )
  }

  const tierIdx = getTierIndex(customer.loyalty_stage, rewardsConfig)
  const tierPalette = TIER_COLOR_PALETTE[tierIdx % TIER_COLOR_PALETTE.length]
  const canRecord = parsedAmount > 0 && !recordTransaction.isPending

  // ── Success state ──────────────────────────────────────────────────────────
  if (recorded) {
    return (
      <div className="max-w-sm mx-auto pt-10 text-center space-y-6">
        <div className="space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Transaction recorded</p>
            <p className="text-4xl font-bold tracking-tight text-foreground">
              {formatAmount(recorded.amount, currencyConfig)}
            </p>
            {recorded.cashback > 0 && (
              <p className="text-sm text-emerald-400 mt-1.5">
                +{formatAmount(recorded.cashback, currencyConfig)} cashback earned
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-secondary/40">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">{customer.name}</p>
            <p className="text-xs text-muted-foreground">
              New balance: {formatAmount(newBalanceAfter, currencyConfig)}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button className="w-full" onClick={handleRecordAnother}>
            Record another
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href={`/customers/${id}`}>Back to profile</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-sm mx-auto flex flex-col" style={{ minHeight: 'calc(100dvh - 180px)' }}>

      {/* Header */}
      <div className="flex items-center mb-3 shrink-0">
        <Link
          href={`/customers/${id}`}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex-1 text-center text-sm font-semibold text-foreground">Record Transaction</span>
        <div className="h-8 w-8" />
      </div>

      {/* Customer — compact single row */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{customer.name}</p>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wider shrink-0 ${tierPalette.bg} ${tierPalette.text} ${tierPalette.border}`}
            >
              {getTierDisplayName(customer.loyalty_stage, rewardsConfig)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{customer.email ?? customer.phone ?? 'No contact'}</p>
        </div>
        {currentBalance > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
            <p className="text-xs font-semibold text-foreground">{formatAmount(currentBalance, currencyConfig)}</p>
          </div>
        )}
      </div>

      {/* Amount — hero, grows to fill space */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-baseline justify-center gap-2 w-full">
          {currencyConfig.prefix && (
            <span className="text-3xl font-medium text-muted-foreground/50">{currencyConfig.symbol}</span>
          )}
          <input
            ref={amountInputRef}
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canRecord) recordTransaction.mutate() }}
            placeholder="0"
            className="text-center text-7xl font-bold tracking-tight bg-transparent border-none outline-none focus:outline-none text-foreground placeholder:text-foreground/15 caret-primary w-full max-w-[260px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {!currencyConfig.prefix && (
            <span className="text-3xl font-medium text-muted-foreground/50">{currencyConfig.symbol}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{cashbackRate}% cashback</p>
      </div>

      {/* Bottom section — always sticks near the button */}
      <div className="shrink-0 space-y-3 pt-4">

        {/* Deposit toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground">Consultation deposit <span className="text-xs text-muted-foreground ml-1">· no cashback</span></p>
          <input
            type="checkbox"
            checked={isDeposit}
            onChange={(e) => { setIsDeposit(e.target.checked); if (e.target.checked) setUseBalance(false) }}
            className="h-4 w-4 rounded accent-primary cursor-pointer"
          />
        </div>

        {/* Balance toggle */}
        {currentBalance > 0 && (
          <div className={`flex items-center justify-between transition-opacity ${isDeposit ? 'opacity-30 pointer-events-none' : ''}`}>
            <p className="text-sm text-foreground">
              Use balance <span className="text-xs text-muted-foreground ml-1">· {formatAmount(currentBalance, currencyConfig)} available</span>
            </p>
            <Switch
              checked={useBalance && !isDeposit}
              onCheckedChange={(v) => !isDeposit && setUseBalance(v)}
              disabled={isDeposit}
            />
          </div>
        )}

        {/* Breakdown — compact card, only when amount entered */}
        {parsedAmount > 0 && (
          <div className="rounded-xl bg-secondary/30 px-3 py-2.5 space-y-1.5">
            {balanceUsed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Uses balance</span>
                <span className="text-xs font-medium text-emerald-400">−{formatAmount(balanceUsed, currencyConfig)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Charge on POS</span>
              <span className="text-xs font-bold text-foreground">{formatAmount(chargeOnPOS, currencyConfig)}</span>
            </div>
            {!isDeposit && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cashback ({cashbackRate}%)</span>
                {earnsNow > 0 ? (
                  <span className="text-xs font-medium text-emerald-400">+{formatAmount(earnsNow, currencyConfig)}</span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <span className="text-xs text-muted-foreground">New balance</span>
              <span className="text-xs font-semibold text-foreground">{formatAmount(newBalanceAfter, currencyConfig)}</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={!canRecord}
          onClick={() => recordTransaction.mutate()}
        >
          {recordTransaction.isPending
            ? 'Recording...'
            : parsedAmount > 0
            ? `Record ${formatAmount(chargeOnPOS, currencyConfig)}`
            : 'Enter an amount'}
        </Button>
      </div>
    </div>
  )
}

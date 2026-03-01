'use client'

import { useParams } from 'next/navigation'
import { useCustomer } from '@/hooks/use-customers'
import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
  // Resolve the effective tier slug (handles legacy slugs that no longer exist in config)
  // then read cashback_rate from the live rewards config — customer.cashback_rate can be stale
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
    setUseBalance(false)
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
    <div className="max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link
          href={`/customers/${id}`}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex-1 text-center text-sm font-semibold text-foreground">Record Transaction</span>
        <div className="h-8 w-8" />
      </div>

      {/* Customer */}
      <div className="text-center mb-6 space-y-2">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold text-foreground mx-auto">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{customer.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{customer.email ?? customer.phone ?? 'No contact'}</p>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] uppercase tracking-wider ${tierPalette.bg} ${tierPalette.text} ${tierPalette.border}`}
          >
            {getTierDisplayName(customer.loyalty_stage, rewardsConfig)}
          </Badge>
          {currentBalance > 0 && (
            <span className="text-xs text-muted-foreground">
              Balance{' '}
              <span className="font-medium text-foreground">{formatAmount(currentBalance, currencyConfig)}</span>
            </span>
          )}
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Amount — the hero */}
      <div className="text-center mb-2">
        <div className="flex items-baseline justify-center gap-2.5">
          {currencyConfig.prefix && (
            <span className="text-3xl font-medium text-muted-foreground/60">{currencyConfig.symbol}</span>
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
            className="text-center text-6xl font-bold tracking-tight bg-transparent border-none outline-none focus:outline-none text-foreground placeholder:text-foreground/15 caret-primary max-w-[260px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {!currencyConfig.prefix && (
            <span className="text-3xl font-medium text-muted-foreground/60">{currencyConfig.symbol}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Purchase amount · {cashbackRate}% cashback</p>
      </div>

      <Separator className="my-6" />

      {/* Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Consultation deposit</p>
            <p className="text-xs text-muted-foreground">No cashback will be earned</p>
          </div>
          <input
            type="checkbox"
            checked={isDeposit}
            onChange={(e) => { setIsDeposit(e.target.checked); if (e.target.checked) setUseBalance(false) }}
            className="h-4 w-4 rounded accent-primary cursor-pointer"
          />
        </div>

        {currentBalance > 0 && (
          <div className={`flex items-center justify-between transition-opacity ${isDeposit ? 'opacity-30 pointer-events-none' : ''}`}>
            <div>
              <p className="text-sm text-foreground">Use loyalty balance</p>
              <p className="text-xs text-muted-foreground">{formatAmount(currentBalance, currencyConfig)} available</p>
            </div>
            <Switch
              checked={useBalance && !isDeposit}
              onCheckedChange={(v) => !isDeposit && setUseBalance(v)}
              disabled={isDeposit}
            />
          </div>
        )}
      </div>

      {/* Summary — always visible once amount is entered */}
      {parsedAmount > 0 && (
        <>
          <Separator className="my-6" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Purchase value</span>
              <span className="text-sm font-medium text-foreground">{formatAmount(parsedAmount, currencyConfig)}</span>
            </div>

            {balanceUsed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uses balance</span>
                <span className="text-sm font-medium text-emerald-400">−{formatAmount(balanceUsed, currencyConfig)}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Charge on POS</span>
              <span className="text-sm font-bold text-foreground">{formatAmount(chargeOnPOS, currencyConfig)}</span>
            </div>

            {!isDeposit && (
              <div className="flex items-center justify-between">
                <span className={`text-sm ${earnsNow > 0 ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                  Cashback ({cashbackRate}%)
                </span>
                {earnsNow > 0 ? (
                  <span className="text-sm font-medium text-emerald-400">+{formatAmount(earnsNow, currencyConfig)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">—</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-sm font-medium text-foreground">New balance</span>
              <span className="text-sm font-semibold text-foreground">{formatAmount(newBalanceAfter, currencyConfig)}</span>
            </div>
          </div>
        </>
      )}

      {/* CTA */}
      <div className="mt-8">
        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={!canRecord}
          onClick={() => recordTransaction.mutate()}
        >
          {recordTransaction.isPending
            ? 'Recording...'
            : parsedAmount > 0
            ? `Record ${formatAmount(chargeOnPOS, currencyConfig)}`
            : 'Enter an amount to continue'}
        </Button>
      </div>
    </div>
  )
}

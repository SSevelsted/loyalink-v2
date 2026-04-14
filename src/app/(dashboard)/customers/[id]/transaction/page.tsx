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
import { ArrowLeft, CheckCircle2, ArrowUp, TrendingUp, Trophy, Mail, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ScanDialog } from '@/components/scanner/scan-dialog'
import { getTierDisplayName, getTierIndex, getEffectiveTierSlug } from '@/lib/format'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { TIER_COLOR_PALETTE } from '@/types/database'
import { hapticTap, hapticSuccess } from '@/lib/platform'
import { DirectionalTransition } from '@/components/transitions/directional-transition'

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
  const [recorded, setRecorded] = useState<{
    amount: number
    cashback: number
    newBalance: number
    balanceUsed: number
    chargeOnPOS: number
    summary: {
      tierUpgraded: boolean
      previousTier: { slug: string; name: string; cashbackRate: number } | null
      currentTier: { slug: string; name: string; cashbackRate: number; index: number }
      nextTier: {
        slug: string; name: string; cashbackRate: number
        trigger: { type: string; threshold?: number } | null
        progress: { current: number; threshold: number; remaining: number } | null
      } | null
      cashbackRate: number
      totalSpend: number
      isMaxTier: boolean
    } | null
  } | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [receiptStatus, setReceiptStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const currentBalance = Number(customer?.balance ?? 0)
  const effectiveTierSlug = getEffectiveTierSlug(customer?.loyalty_stage ?? '', rewardsConfig)
  const cashbackRate =
    rewardsConfig?.tiers.find((t) => t.slug === effectiveTierSlug)?.cashback_rate ??
    Number(customer?.cashback_rate ?? 0)
  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0
  const balanceUsed = useBalance ? Math.min(currentBalance, parsedAmount) : 0
  const chargeOnPOS = parsedAmount - balanceUsed
  const earnsNow = chargeOnPOS * cashbackRate / 100
  const newBalanceAfter = currentBalance - balanceUsed + earnsNow

  const recordTransaction = useMutation({
    mutationFn: async () => {
      if (!currentStudio || parsedAmount <= 0) throw new Error('Invalid amount')

      if (balanceUsed > 0) {
        const { error: debitErr } = await supabase.from('transactions').insert({
          customer_id: id,
          studio_id: currentStudio.id,
          type: 'debit',
          amount: balanceUsed,
          description: 'Loyalty balance redeemed',
        })
        if (debitErr) throw new Error(debitErr.message)
        await supabase.from('customers').update({ balance: currentBalance - balanceUsed }).eq('id', id)
      }

      const { error: creditErr } = await supabase.from('transactions').insert({
        customer_id: id,
        studio_id: currentStudio.id,
        type: 'credit',
        amount: parsedAmount,
        description: isDeposit ? 'Deposit' : null,
      })
      if (creditErr) throw new Error(creditErr.message)

      const result = await processTransaction.mutateAsync({
        customerId: id,
        studioId: currentStudio.id,
        transactionId: '',
        amount: parsedAmount,
        cashAmount: chargeOnPOS,
        isDeposit,
      })
      return result
    },
    onSuccess: (result) => {
      hapticSuccess()
      queryClient.invalidateQueries({ queryKey: ['transactions', id] })
      queryClient.invalidateQueries({ queryKey: ['all_transactions'] })
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customer_events', id] })
      setRecorded({
        amount: parsedAmount,
        cashback: earnsNow,
        newBalance: newBalanceAfter,
        balanceUsed,
        chargeOnPOS,
        summary: result?.summary ?? null,
      })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record transaction')
    },
  })

  async function sendReceipt() {
    if (!recorded || !currentStudio || receiptStatus !== 'idle') return
    setReceiptStatus('sending')
    try {
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
          tierName: s?.currentTier.name ?? getTierDisplayName(customer?.loyalty_stage ?? '', rewardsConfig),
          tierUpgraded: s?.tierUpgraded ?? false,
          newTierName: s?.tierUpgraded ? s.currentTier.name : null,
          currency: currencyConfig.symbol,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send')
      }
      setReceiptStatus('sent')
      toast.success('Receipt sent')
    } catch (err) {
      setReceiptStatus('idle')
      toast.error(err instanceof Error ? err.message : 'Failed to send receipt')
    }
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
    const s = recorded.summary
    const currentTierPalette = s
      ? TIER_COLOR_PALETTE[s.currentTier.index % TIER_COLOR_PALETTE.length]
      : tierPalette
    const nextTierPalette = s?.nextTier
      ? TIER_COLOR_PALETTE[(s.currentTier.index + 1) % TIER_COLOR_PALETTE.length]
      : null

    return (
      <div className="max-w-sm mx-auto pt-6 space-y-4">
        {/* Header — peak moment */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-xl animate-celebrate-glow" aria-hidden="true" />
            <div className="relative h-16 w-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center animate-celebrate">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
            <p className="text-sm text-muted-foreground mb-0.5">Transaction recorded</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {formatAmount(recorded.amount, currencyConfig)}
            </p>
          </div>
        </div>

        {/* Tier upgrade banner */}
        {s?.tierUpgraded && s.previousTier && (
          <div className={`rounded-xl border ${currentTierPalette.border} ${currentTierPalette.bg} px-4 py-3`}>
            <div className="flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-full ${currentTierPalette.bg} border ${currentTierPalette.border} flex items-center justify-center`}>
                <ArrowUp className={`h-4 w-4 ${currentTierPalette.text}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${currentTierPalette.text}`}>
                  Upgraded to {s.currentTier.name}!
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.previousTier.name} ({s.previousTier.cashbackRate}%) &rarr; {s.currentTier.name} ({s.currentTier.cashbackRate}%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction breakdown */}
        <div className="rounded-xl bg-secondary/30 px-3.5 py-3 space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Breakdown</p>
          {recorded.balanceUsed > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Balance redeemed</span>
              <span className="text-xs font-medium text-emerald-400">-{formatAmount(recorded.balanceUsed, currencyConfig)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Charged on POS</span>
            <span className="text-xs font-medium text-foreground">{formatAmount(recorded.chargeOnPOS, currencyConfig)}</span>
          </div>
          {recorded.cashback > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cashback earned ({s?.cashbackRate ?? cashbackRate}%)</span>
              <span className="text-xs font-medium text-emerald-400">+{formatAmount(recorded.cashback, currencyConfig)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
            <span className="text-xs font-medium text-foreground">New balance</span>
            <span className="text-xs font-bold text-foreground">{formatAmount(recorded.newBalance, currencyConfig)}</span>
          </div>
        </div>

        {/* Customer status card */}
        <div className="rounded-xl bg-secondary/30 px-3.5 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{customer.name}</p>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase tracking-wider ${currentTierPalette.bg} ${currentTierPalette.text} ${currentTierPalette.border}`}
                >
                  {s?.currentTier.name ?? getTierDisplayName(customer.loyalty_stage, rewardsConfig)}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{s?.currentTier.cashbackRate ?? cashbackRate}% cashback</span>
              </div>
            </div>
          </div>

          {/* Next tier progress */}
          {s?.nextTier && !s.isMaxTier && (
            <div className="pt-1.5 border-t border-border/30">
              {s.nextTier.progress ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Next: {s.nextTier.name} ({s.nextTier.cashbackRate}%)
                    </span>
                    <span className={`text-[11px] font-medium ${nextTierPalette?.text ?? 'text-muted-foreground'}`}>
                      {formatAmount(s.nextTier.progress.remaining, currencyConfig)} to go
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${nextTierPalette?.dot ?? 'bg-primary'}`}
                      style={{ width: `${Math.min(100, (s.nextTier.progress.current / s.nextTier.progress.threshold) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : s.nextTier.trigger ? (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    Next: {s.nextTier.name} &middot;{' '}
                    {s.nextTier.trigger.type === 'first_purchase' && 'After first purchase'}
                    {s.nextTier.trigger.type === 'first_full_payment' && 'After first full payment'}
                    {s.nextTier.trigger.type === 'referral_count' && `Refer ${s.nextTier.trigger.threshold ?? 1} friend${(s.nextTier.trigger.threshold ?? 1) > 1 ? 's' : ''}`}
                    {s.nextTier.trigger.type === 'days_member' && `After ${s.nextTier.trigger.threshold ?? 30} days as a member`}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Max tier badge */}
          {s?.isMaxTier && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/30">
              <Trophy className={`h-3 w-3 ${currentTierPalette.text}`} />
              <span className={`text-[11px] font-medium ${currentTierPalette.text}`}>Highest tier reached</span>
            </div>
          )}
        </div>

        {/* Send receipt */}
        {customer.email && (
          <button
            onClick={sendReceipt}
            disabled={receiptStatus !== 'idle'}
            className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 disabled:opacity-50"
          >
            {receiptStatus === 'sending' ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
            ) : receiptStatus === 'sent' ? (
              <><Check className="h-3 w-3 text-emerald-400" /> <span className="text-emerald-400">Receipt sent to {customer.email}</span></>
            ) : (
              <><Mail className="h-3 w-3" /> Send receipt to {customer.email}</>
            )}
          </button>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <Button className="w-full" onClick={() => setShowScanner(true)}>
            Scan new customer
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href={`/customers/${id}`}>Back to profile</Link>
          </Button>
        </div>

        <ScanDialog open={showScanner} onOpenChange={setShowScanner} />
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <DirectionalTransition>
      <div className="max-w-sm mx-auto flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center mb-3 shrink-0">
        <Link
          href={`/customers/${id}`}
          transitionTypes={['nav-back']}
          aria-label="Back to customer"
          className="h-11 w-11 -ml-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary active:bg-secondary active:scale-95 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
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
          <p className="text-sm text-foreground">Deposit</p>
          <Switch
            checked={isDeposit}
            onCheckedChange={setIsDeposit}
          />
        </div>

        {/* Balance toggle */}
        {currentBalance > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">
              Use balance <span className="text-xs text-muted-foreground ml-1">· {formatAmount(currentBalance, currencyConfig)} available</span>
            </p>
            <Switch
              checked={useBalance}
              onCheckedChange={setUseBalance}
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cashback ({cashbackRate}%)</span>
              {earnsNow > 0 ? (
                <span className="text-xs font-medium text-emerald-400">+{formatAmount(earnsNow, currencyConfig)}</span>
              ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
              )}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <span className="text-xs text-muted-foreground">New balance</span>
              <span className="text-xs font-semibold text-foreground">{formatAmount(newBalanceAfter, currencyConfig)}</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full h-12 text-base font-semibold active:scale-[0.98]"
          disabled={!canRecord}
          onClick={() => { hapticTap(); recordTransaction.mutate() }}
        >
          {recordTransaction.isPending
            ? 'Recording...'
            : parsedAmount > 0
            ? `Record ${formatAmount(chargeOnPOS, currencyConfig)}`
            : 'Enter an amount'}
        </Button>
      </div>
      </div>
    </DirectionalTransition>
  )
}

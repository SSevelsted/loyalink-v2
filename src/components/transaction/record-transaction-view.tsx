'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, CheckCircle2, ArrowUp, TrendingUp, Trophy, Mail, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { formatAmount, type CurrencyConfig } from '@/lib/currency'
import { TIER_COLOR_PALETTE } from '@/types/database'
import { hapticTap, hapticSuccess } from '@/lib/platform'

// ── Shared types ─────────────────────────────────────────────────────────────
// The summary shape returned by processTransaction() (both the dashboard's
// /api/rewards/process-transaction and the embed's /api/embed/transactions).
export type RecordTransactionSummary = {
  tierUpgraded: boolean
  previousTier: { slug: string; name: string; cashbackRate: number } | null
  currentTier: { slug: string; name: string; cashbackRate: number; index: number }
  nextTier: {
    slug: string
    name: string
    cashbackRate: number
    trigger: { type: string; threshold?: number } | null
    progress: { current: number; threshold: number; remaining: number } | null
  } | null
  cashbackRate: number
  totalSpend: number
  isMaxTier: boolean
} | null

export type RecordedTransaction = {
  amount: number
  cashback: number
  newBalance: number
  balanceUsed: number
  chargeOnPOS: number
  summary: RecordTransactionSummary
}

export type RecordTransactionCustomer = {
  name: string
  email?: string | null
  phone?: string | null
}

export type RecordTransactionViewProps = {
  customer: RecordTransactionCustomer
  currencyConfig: CurrencyConfig
  /** Effective cashback rate (%) for this customer, resolved by the caller. */
  cashbackRate: number
  currentBalance: number
  /** Display name of the customer's current tier, resolved by the caller. */
  tierName: string
  /** Index into TIER_COLOR_PALETTE for the current tier, resolved by the caller. */
  tierIndex: number
  /** Records the transaction and resolves with the processed summary. Throws on failure. */
  onRecord: (input: {
    amount: number
    chargeOnPOS: number
    balanceUsed: number
    isDeposit: boolean
    useBalance: boolean
  }) => Promise<{ summary: RecordTransactionSummary }>
  headerLabel?: string
  /** Header back control. Omit to render a spacer instead. */
  backSlot?: React.ReactNode
  /** Success-screen primary action ("Scan next customer"). Omit to hide. */
  onScanNext?: () => void
  /** Success-screen secondary action ("Done" / "Back to profile"). */
  secondarySuccessAction?: React.ReactNode
  /** Sends a receipt for the recorded transaction. Omit to hide the receipt button. */
  onSendReceipt?: (recorded: RecordedTransaction) => Promise<void>
}

export function RecordTransactionView({
  customer,
  currencyConfig,
  cashbackRate,
  currentBalance,
  tierName,
  tierIndex,
  onRecord,
  headerLabel = 'Record Transaction',
  backSlot,
  onScanNext,
  secondarySuccessAction,
  onSendReceipt,
}: RecordTransactionViewProps) {
  const [amount, setAmount] = useState('')
  const [isDeposit, setIsDeposit] = useState(false)
  const [useBalance, setUseBalance] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [recorded, setRecorded] = useState<RecordedTransaction | null>(null)
  const [receiptStatus, setReceiptStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0
  const balanceUsed = useBalance ? Math.min(currentBalance, parsedAmount) : 0
  const chargeOnPOS = parsedAmount - balanceUsed
  const earnsNow = (chargeOnPOS * cashbackRate) / 100
  const newBalanceAfter = currentBalance - balanceUsed + earnsNow
  const canRecord = parsedAmount > 0 && !isPending

  const tierPalette = TIER_COLOR_PALETTE[tierIndex % TIER_COLOR_PALETTE.length]

  async function handleRecord() {
    if (!canRecord) return
    hapticTap()
    setIsPending(true)
    try {
      const { summary } = await onRecord({ amount: parsedAmount, chargeOnPOS, balanceUsed, isDeposit, useBalance })
      hapticSuccess()
      setRecorded({
        amount: parsedAmount,
        cashback: earnsNow,
        newBalance: newBalanceAfter,
        balanceUsed,
        chargeOnPOS,
        summary,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record transaction')
    } finally {
      setIsPending(false)
    }
  }

  async function handleSendReceipt() {
    if (!recorded || !onSendReceipt || receiptStatus !== 'idle') return
    setReceiptStatus('sending')
    try {
      await onSendReceipt(recorded)
      setReceiptStatus('sent')
      toast.success('Receipt sent')
    } catch (err) {
      setReceiptStatus('idle')
      toast.error(err instanceof Error ? err.message : 'Failed to send receipt')
    }
  }

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
            <p className="text-sm text-muted-foreground mb-1">Transaction recorded</p>
            <p className="text-5xl font-bold tracking-tighter tabular-nums text-foreground">
              {formatAmount(recorded.amount, currencyConfig)}
            </p>
          </div>
        </div>

        {/* Tier upgrade banner */}
        {s?.tierUpgraded && s.previousTier && (
          <div className={`rounded-2xl border ${currentTierPalette.border} ${currentTierPalette.bg} px-4 py-3.5`}>
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
        <div className="rounded-2xl bg-secondary/30 px-4 py-3.5 space-y-2.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Breakdown</p>
          {recorded.balanceUsed > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Balance redeemed</span>
              <span className="text-[13px] font-medium text-emerald-400">-{formatAmount(recorded.balanceUsed, currencyConfig)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">Charged on POS</span>
            <span className="text-[13px] font-medium text-foreground">{formatAmount(recorded.chargeOnPOS, currencyConfig)}</span>
          </div>
          {recorded.cashback > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Cashback earned ({s?.cashbackRate ?? cashbackRate}%)</span>
              <span className="text-[13px] font-medium text-emerald-400">+{formatAmount(recorded.cashback, currencyConfig)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
            <span className="text-[13px] font-medium text-foreground">New balance</span>
            <span className="text-[13px] font-semibold text-foreground">{formatAmount(recorded.newBalance, currencyConfig)}</span>
          </div>
        </div>

        {/* Customer status card */}
        <div className="rounded-2xl bg-secondary/30 px-4 py-3.5 space-y-2.5">
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
                  {s?.currentTier.name ?? tierName}
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
        {onSendReceipt && customer.email && (
          <button
            onClick={handleSendReceipt}
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
        {(onScanNext || secondarySuccessAction) && (
          <div className="space-y-2 pt-1">
            {onScanNext && (
              <Button className="w-full h-13 rounded-2xl text-base font-semibold active:scale-[0.98]" onClick={onScanNext}>
                Scan next customer
              </Button>
            )}
            {secondarySuccessAction}
          </div>
        )}
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-sm mx-auto flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center mb-3 shrink-0">
        {backSlot ?? <div className="h-11 w-11 -ml-2" />}
        <span className="flex-1 text-center text-sm font-semibold text-foreground">{headerLabel}</span>
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
              {tierName}
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
        <div className="flex items-baseline justify-center gap-2.5">
          {currencyConfig.prefix && (
            <span className="text-4xl font-medium text-muted-foreground/40">{currencyConfig.symbol}</span>
          )}
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canRecord) handleRecord() }}
            placeholder="0"
            style={{ width: `${Math.max(1, amount.length)}ch` }}
            className="text-center text-8xl font-bold tracking-tighter tabular-nums bg-transparent border-none outline-none focus:outline-none text-foreground placeholder:text-foreground/15 caret-primary max-w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {!currencyConfig.prefix && (
            <span className="text-4xl font-medium text-muted-foreground/40">{currencyConfig.symbol}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-4">{cashbackRate}% cashback</p>
      </div>

      {/* Bottom section — always sticks near the button */}
      <div className="shrink-0 space-y-3 pt-4">
        {/* Toggles — grouped card */}
        <div className="rounded-2xl bg-secondary/30 divide-y divide-border/30">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm text-foreground">Deposit</p>
            <Switch checked={isDeposit} onCheckedChange={setIsDeposit} />
          </div>

          {currentBalance > 0 && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm text-foreground">
                Use balance <span className="text-xs text-muted-foreground ml-1">· {formatAmount(currentBalance, currencyConfig)} available</span>
              </p>
              <Switch checked={useBalance} onCheckedChange={setUseBalance} />
            </div>
          )}
        </div>

        {/* Breakdown — compact card, only when amount entered */}
        {parsedAmount > 0 && (
          <div className="rounded-2xl bg-secondary/30 px-4 py-3.5 space-y-2.5">
            {balanceUsed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Uses balance</span>
                <span className="text-[13px] font-medium text-emerald-400">−{formatAmount(balanceUsed, currencyConfig)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">Charge on POS</span>
              <span className="text-[13px] font-semibold text-foreground">{formatAmount(chargeOnPOS, currencyConfig)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Cashback ({cashbackRate}%)</span>
              {earnsNow > 0 ? (
                <span className="text-[13px] font-medium text-emerald-400">+{formatAmount(earnsNow, currencyConfig)}</span>
              ) : (
                <span className="text-[13px] text-muted-foreground/50">—</span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
              <span className="text-[13px] text-muted-foreground">New balance</span>
              <span className="text-[13px] font-semibold text-foreground">{formatAmount(newBalanceAfter, currencyConfig)}</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full h-13 rounded-2xl text-base font-semibold active:scale-[0.98]"
          disabled={!canRecord}
          onClick={handleRecord}
        >
          {isPending
            ? 'Recording...'
            : parsedAmount > 0
            ? `Record ${formatAmount(chargeOnPOS, currencyConfig)}`
            : 'Enter an amount'}
        </Button>
      </div>
    </div>
  )
}

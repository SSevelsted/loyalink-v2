'use client'

import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Keyboard, Loader2 } from 'lucide-react'
import { QrScanner } from '@/components/scanner/qr-scanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStudio } from '@/hooks/use-studio'
import { getCurrencyConfig } from '@/lib/currency'
import { getTierDisplayName, getTierIndex } from '@/lib/format'
import { rewardsConfigFromStudio } from '@/lib/embed-rewards'
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

export default function EmbedScanPage() {
  const { currentStudio } = useStudio()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const studioId = currentStudio?.id
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'looking-up'>('idle')
  const lookingUpRef = useRef(false)

  const currencyConfig = getCurrencyConfig((currentStudio?.settings?.currency as string) ?? 'kr')
  const rewardsConfig = rewardsConfigFromStudio(currentStudio)

  const lookupCustomer = useCallback(async (value: string) => {
    if (!studioId || !token || !value.trim() || lookingUpRef.current) return
    lookingUpRef.current = true
    setStatus('looking-up')
    setError(null)
    setCustomer(null)
    try {
      const params = new URLSearchParams({ studioId, token, value: value.trim() })
      const res = await fetch(`/api/embed/scan?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Customer not found')
      setCustomer(data.customer)
      setManualMode(false)
      setManualInput('')
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
      setStatus('idle')
    } finally {
      lookingUpRef.current = false
    }
  }, [studioId, token])

  const handleScan = useCallback((value: string) => {
    lookupCustomer(value)
  }, [lookupCustomer])

  const recordTransaction = useCallback(
    async (input: { amount: number; chargeOnPOS: number; balanceUsed: number; isDeposit: boolean; useBalance: boolean }) => {
      if (!studioId || !token || !customer) throw new Error('Missing session')
      const res = await fetch('/api/embed/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId,
          token,
          customerId: customer.id,
          amount: input.amount,
          cashAmount: input.chargeOnPOS,
          balanceUsed: input.balanceUsed,
          isDeposit: input.isDeposit,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not record transaction')
      return { summary: (data.summary ?? null) as RecordTransactionSummary }
    },
    [studioId, token, customer]
  )

  function resetScanner() {
    setCustomer(null)
    setError(null)
    setStatus('idle')
  }

  if (!studioId || !token) {
    return (
      <div className="flex min-h-[640px] items-center justify-center text-sm text-muted-foreground">
        Missing embed access.
      </div>
    )
  }

  // ── Transaction (customer found) — slick shared screen ──────────────────────
  if (customer) {
    return (
      <div className="min-h-[calc(100vh-190px)] py-2">
        <RecordTransactionView
          customer={{ name: customer.name ?? 'Unnamed customer', email: customer.email, phone: customer.phone }}
          currencyConfig={currencyConfig}
          cashbackRate={Number(customer.cashback_rate ?? 0)}
          currentBalance={Number(customer.balance ?? 0)}
          tierName={getTierDisplayName(customer.loyalty_stage ?? '', rewardsConfig)}
          tierIndex={getTierIndex(customer.loyalty_stage ?? '', rewardsConfig)}
          onRecord={recordTransaction}
          backSlot={
            <button
              onClick={resetScanner}
              aria-label="Back to scanner"
              className="h-11 w-11 -ml-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          }
          onScanNext={resetScanner}
        />
      </div>
    )
  }

  // ── Scanner (no customer yet) ───────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="relative min-h-[520px] rounded-2xl bg-black text-white overflow-hidden">
        <QrScanner onScan={handleScan} active={!manualMode && status !== 'looking-up'} fullscreen />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-56 w-56">
            <div className="absolute top-0 left-0 h-12 w-12 rounded-tl-2xl border-l-4 border-t-4 border-white" />
            <div className="absolute top-0 right-0 h-12 w-12 rounded-tr-2xl border-r-4 border-t-4 border-white" />
            <div className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-white" />
            <div className="absolute bottom-0 right-0 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-white" />
          </div>
        </div>

        <div className="absolute left-0 right-0 top-8 text-center">
          <p className="text-sm font-medium text-white/80">Scan the customer loyalty card</p>
        </div>

        {(status === 'looking-up' || manualMode) && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
        )}

        {status === 'looking-up' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-white/70">Looking up customer...</p>
          </div>
        )}

        {manualMode ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl">
              <p className="mb-3 text-sm font-medium">Enter member ID or phone</p>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') lookupCustomer(manualInput)
                    if (event.key === 'Escape') setManualMode(false)
                  }}
                  className="border-white/10 bg-white/10 text-white placeholder:text-white/40"
                  placeholder="Member ID or phone..."
                />
                <Button onClick={() => lookupCustomer(manualInput)} disabled={!manualInput.trim()}>
                  Find
                </Button>
              </div>
              <button
                onClick={() => setManualMode(false)}
                className="mt-3 text-xs text-white/50 hover:text-white"
              >
                Back to camera
              </button>
            </div>
          </div>
        ) : (
          status !== 'looking-up' && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <Button onClick={() => setManualMode(true)} variant="secondary" className="gap-2 rounded-xl">
                <Keyboard className="h-4 w-4" />
                Enter manually
              </Button>
            </div>
          )
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  )
}

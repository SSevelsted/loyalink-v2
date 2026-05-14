'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Keyboard, Loader2, QrCode, RotateCcw, ScanLine } from 'lucide-react'
import { QrScanner } from '@/components/scanner/qr-scanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useStudio } from '@/hooks/use-studio'

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
  const [amount, setAmount] = useState('')
  const [useBalance, setUseBalance] = useState(true)
  const [isDeposit, setIsDeposit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'looking-up' | 'recording' | 'recorded'>('idle')
  const lookingUpRef = useRef(false)

  const parsedAmount = Number.parseFloat(amount.replace(',', '.')) || 0
  const currentBalance = Number(customer?.balance ?? 0)
  const cashbackRate = Number(customer?.cashback_rate ?? 0)
  const balanceUsed = useBalance ? Math.min(currentBalance, parsedAmount) : 0
  const chargeOnPOS = Math.max(0, parsedAmount - balanceUsed)
  const estimatedCashback = chargeOnPOS * cashbackRate / 100

  const currency = useMemo(() => {
    const settings = currentStudio?.settings as Record<string, unknown> | null | undefined
    return (settings?.currency as string | undefined) ?? 'kr'
  }, [currentStudio])

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

  async function recordTransaction() {
    if (!studioId || !token || !customer || parsedAmount <= 0 || status === 'recording') return
    setStatus('recording')
    setError(null)
    try {
      const res = await fetch('/api/embed/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId,
          token,
          customerId: customer.id,
          amount: parsedAmount,
          cashAmount: chargeOnPOS,
          balanceUsed,
          isDeposit,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not record transaction')
      setCustomer((prev) => prev ? {
        ...prev,
        balance: Number(data.summary?.newBalance ?? prev.balance ?? 0),
        total_real_spend: Number(data.summary?.totalSpend ?? prev.total_real_spend ?? 0),
      } : prev)
      setStatus('recorded')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record transaction')
      setStatus('idle')
    }
  }

  function resetScanner() {
    setCustomer(null)
    setAmount('')
    setUseBalance(true)
    setIsDeposit(false)
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

  return (
    <div className="min-h-[calc(100vh-190px)] rounded-2xl bg-black text-white overflow-hidden">
      <div className="grid min-h-[calc(100vh-190px)] lg:grid-cols-[minmax(0,1.15fr)_420px]">
        <section className="relative min-h-[520px] bg-black">
          {!customer ? (
            <>
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
              {manualMode && (
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
              )}
            </>
          ) : (
            <div className="flex h-full min-h-[520px] items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                  {status === 'recorded' ? <CheckCircle2 className="h-8 w-8" /> : <QrCode className="h-8 w-8" />}
                </div>
                <p className="text-sm text-white/50">{status === 'recorded' ? 'Transaction recorded' : 'Customer found'}</p>
                <h2 className="mt-1 text-3xl font-semibold">{customer.name ?? 'Unnamed customer'}</h2>
                <p className="mt-2 text-sm text-white/45">{customer.phone ?? customer.email ?? 'No contact info'}</p>
              </div>
            </div>
          )}
        </section>

        <aside className="border-l border-white/10 bg-zinc-950 p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Loyalty scanner</h1>
              <p className="text-xs text-white/45">Scan, redeem balance, record spend.</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {!customer ? (
            <div className="space-y-3">
              <Button
                onClick={() => setManualMode(true)}
                className="h-12 w-full justify-center gap-2 rounded-xl"
                variant="secondary"
              >
                <Keyboard className="h-4 w-4" />
                Enter manually
              </Button>
              <p className="text-xs leading-5 text-white/45">
                Works from StreamInk in the browser and inside the app. The customer opens their wallet pass, you scan the QR code, and the transaction flow opens immediately.
              </p>
            </div>
          ) : status === 'recorded' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-200">Saved successfully.</p>
                <p className="mt-1 text-xs text-white/45">The customer balance and loyalty history are updated.</p>
              </div>
              <Button onClick={resetScanner} className="h-12 w-full rounded-xl">
                Scan next customer
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium">{customer.name ?? 'Unnamed customer'}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/40">Balance</p>
                    <p className="font-semibold">{currentBalance.toFixed(0)} {currency}</p>
                  </div>
                  <div>
                    <p className="text-white/40">Cashback</p>
                    <p className="font-semibold">{cashbackRate}%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Session amount</label>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={`0 ${currency}`}
                  className="h-12 border-white/10 bg-white/10 text-lg text-white placeholder:text-white/35"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium">Use available balance</p>
                  <p className="text-xs text-white/40">Redeems {balanceUsed.toFixed(0)} {currency}</p>
                </div>
                <Switch checked={useBalance} onCheckedChange={setUseBalance} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div>
                  <p className="text-sm font-medium">Deposit</p>
                  <p className="text-xs text-white/40">Marks the payment as a deposit.</p>
                </div>
                <Switch checked={isDeposit} onCheckedChange={setIsDeposit} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/45">Charge on POS</span>
                  <span className="font-semibold">{chargeOnPOS.toFixed(0)} {currency}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-white/45">Estimated cashback</span>
                  <span className="font-semibold">{estimatedCashback.toFixed(0)} {currency}</span>
                </div>
              </div>

              <Button
                onClick={recordTransaction}
                disabled={parsedAmount <= 0 || status === 'recording'}
                className="h-12 w-full rounded-xl"
              >
                {status === 'recording' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record transaction
              </Button>

              <button onClick={resetScanner} className="w-full text-center text-xs text-white/45 hover:text-white">
                Scan another customer
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'permanent' | 'boost'
type DurationType = 'unlimited' | 'days' | 'transactions'

type Tier = { slug: string; name: string; cashback_rate: number }

interface MemberManageDialogProps {
  studioId: string
  token: string
  customerId: string
  currentTier: string
  currentCashback: number
  currentBalance: number
  tiers: Tier[]
}

// Declared at module scope — the React compiler forbids components created
// during render (also avoids resetting input state on rerender).
function ModeSelect({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Apply as</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Mode)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="permanent">Permanent change</SelectItem>
          <SelectItem value="boost">Timed boost (revertible)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function DurationFields({
  type,
  value,
  onType,
  onValue,
}: {
  type: DurationType
  value: string
  onType: (t: DurationType) => void
  onValue: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Lasts</Label>
        <Select value={type} onValueChange={(v) => onType(v as DurationType)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unlimited">Until changed</SelectItem>
            <SelectItem value="days">For N days</SelectItem>
            <SelectItem value="transactions">For N purchases</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {type !== 'unlimited' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{type === 'days' ? 'Days' : 'Purchases'}</Label>
          <Input type="number" min={1} className="h-8 text-xs" value={value} onChange={(e) => onValue(e.target.value)} />
        </div>
      )}
    </div>
  )
}

export function MemberManageDialog({
  studioId,
  token,
  customerId,
  currentTier,
  currentCashback,
  currentBalance,
  tiers,
}: MemberManageDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const [tierSlug, setTierSlug] = useState(currentTier)
  const [tierMode, setTierMode] = useState<Mode>('permanent')
  const [tierDurationType, setTierDurationType] = useState<DurationType>('unlimited')
  const [tierDurationValue, setTierDurationValue] = useState('')

  const [cashbackRate, setCashbackRate] = useState(currentCashback ? String(currentCashback) : '')
  const [cbMode, setCbMode] = useState<Mode>('boost')
  const [cbDurationType, setCbDurationType] = useState<DurationType>('unlimited')
  const [cbDurationValue, setCbDurationValue] = useState('')

  const [balanceType, setBalanceType] = useState<'credit' | 'debit'>('credit')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceNote, setBalanceNote] = useState('')

  const mutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (body: Record<string, any>) => {
      const res = await fetch(`/api/embed/customers/${customerId}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId, token, ...body }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Something went wrong')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embed-customer', studioId, customerId] })
      toast.success('Loyalty updated')
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const durationPayload = (type: DurationType, value: string) =>
    type === 'unlimited' ? { durationType: 'unlimited' } : { durationType: type, durationValue: Math.trunc(Number(value)) }

  const submitTier = () => {
    if (!tierSlug) return toast.error('Pick a tier')
    mutation.mutate({
      action: 'set_tier',
      tierSlug,
      mode: tierMode,
      ...(tierMode === 'boost' ? durationPayload(tierDurationType, tierDurationValue) : {}),
    })
  }

  const submitCashback = () => {
    const rate = Number(cashbackRate)
    if (!Number.isFinite(rate) || rate <= 0) return toast.error('Enter a cashback rate')
    mutation.mutate({
      action: 'set_cashback',
      cashbackRate: rate,
      mode: cbMode,
      ...(cbMode === 'boost' ? durationPayload(cbDurationType, cbDurationValue) : {}),
    })
  }

  const submitBalance = () => {
    const amount = Number(balanceAmount)
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter an amount')
    mutation.mutate({
      action: 'adjust_balance',
      type: balanceType,
      amount,
      ...(balanceNote.trim() ? { description: balanceNote.trim() } : {}),
    })
  }

  const busy = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
          <Settings2 className="h-4 w-4" /> Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage loyalty</DialogTitle>
          <DialogDescription>Change this customer&apos;s tier, cashback rate, or balance.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tier">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tier">Tier</TabsTrigger>
            <TabsTrigger value="cashback">Cashback</TabsTrigger>
            <TabsTrigger value="balance">Balance</TabsTrigger>
          </TabsList>

          <TabsContent value="tier" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tier</Label>
              <Select value={tierSlug} onValueChange={setTierSlug}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name} · {t.cashback_rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ModeSelect value={tierMode} onChange={setTierMode} />
            {tierMode === 'boost' && (
              <DurationFields type={tierDurationType} value={tierDurationValue} onType={setTierDurationType} onValue={setTierDurationValue} />
            )}
            <DialogFooter>
              <Button onClick={submitTier} disabled={busy} size="sm">
                {busy && <Loader2 className="h-3 w-3 animate-spin" />} Apply tier
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="cashback" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Cashback rate (%)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                className="h-8 text-xs"
                placeholder="e.g. 15"
                value={cashbackRate}
                onChange={(e) => setCashbackRate(e.target.value)}
              />
            </div>
            <ModeSelect value={cbMode} onChange={setCbMode} />
            {cbMode === 'boost' && (
              <DurationFields type={cbDurationType} value={cbDurationValue} onType={setCbDurationType} onValue={setCbDurationValue} />
            )}
            <DialogFooter>
              <Button onClick={submitCashback} disabled={busy} size="sm">
                {busy && <Loader2 className="h-3 w-3 animate-spin" />} Apply cashback
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="balance" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Current balance: <span className="font-medium text-foreground">{currentBalance.toFixed(2)}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={balanceType} onValueChange={(v) => setBalanceType(v as 'credit' | 'debit')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (add)</SelectItem>
                    <SelectItem value="debit">Debit (remove)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount</Label>
                <Input type="number" min={0} step="0.01" className="h-8 text-xs" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Input className="h-8 text-xs" placeholder="Reason for adjustment" value={balanceNote} onChange={(e) => setBalanceNote(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={submitBalance} disabled={busy} size="sm">
                {busy && <Loader2 className="h-3 w-3 animate-spin" />} Adjust balance
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

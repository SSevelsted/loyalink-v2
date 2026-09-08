'use client'

import { useState } from 'react'
import { useTrialCodes, useCreateTrialCode, useRevokeTrialCode, type AdminTrialCode } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Copy, Link2, Loader2, Ticket, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'

type CodeStatus = 'available' | 'redeemed' | 'expired'

function getStatus(code: AdminTrialCode, now: number): CodeStatus {
  if (code.redeemed_at) return 'redeemed'
  if (code.expires_at && new Date(code.expires_at).getTime() < now) return 'expired'
  return 'available'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Could not copy to clipboard')
  }
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ code, now }: { code: AdminTrialCode; now: number }) {
  const status = getStatus(code, now)
  const map: Record<CodeStatus, { label: string; className: string }> = {
    available: { label: 'Available', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    redeemed: { label: 'Used', className: 'bg-primary/10 text-primary border-primary/20' },
    expired: { label: 'Expired', className: 'bg-secondary text-muted-foreground border-border' },
  }
  const config = map[status]
  return (
    <Badge variant="outline" className={`text-[10px] border ${config.className}`}>
      {config.label}
    </Badge>
  )
}

// ─── Create form ─────────────────────────────────────────────────────────────

function CreateTrialCodeForm() {
  const [trialDays, setTrialDays] = useState('45')
  const [note, setNote] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [created, setCreated] = useState<AdminTrialCode | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const { mutateAsync, isPending } = useCreateTrialCode()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const days = Number(trialDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      toast.error('Trial length must be between 1 and 365 days')
      return
    }
    const expiry = expiresInDays.trim() === '' ? null : Number(expiresInDays)
    if (expiry !== null && (!Number.isInteger(expiry) || expiry < 1 || expiry > 365)) {
      toast.error('Link validity must be between 1 and 365 days, or empty for no expiry')
      return
    }

    try {
      const code = await mutateAsync({ trialDays: days, note: note.trim() || undefined, expiresInDays: expiry })
      setCreated(code)
      setCopied(null)
      setNote('')
      toast.success(`Trial code ${code.code} created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create trial code')
    }
  }

  async function handleCopy(kind: 'code' | 'link') {
    if (!created) return
    await copyToClipboard(kind === 'code' ? created.code : created.signup_url, kind === 'code' ? 'Code' : 'Signup link')
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Generate a trial code</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Single-use. The studio gets the extended trial instead of the default 14 days when it signs up with the code or link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[110px_1fr_130px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="trialDays" className="text-xs text-muted-foreground">Trial length</Label>
          <div className="relative">
            <Input
              id="trialDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="pr-12"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note" className="text-xs text-muted-foreground">Note (who it&apos;s for)</Label>
          <Input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Black Anchor Tattoo — met at convention"
            maxLength={200}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresInDays" className="text-xs text-muted-foreground">Valid for</Label>
          <div className="relative">
            <Input
              id="expiresInDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="∞"
              className="pr-12"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span>
          </div>
        </div>
        <Button type="submit" disabled={isPending} className="sm:mb-0">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          Generate
        </Button>
      </form>

      {created && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">New code · {created.trial_days}-day trial</p>
              <p className="font-mono text-sm font-semibold text-foreground truncate">{created.code}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => handleCopy('code')}>
                {copied === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Code
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleCopy('link')}>
                {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                Signup link
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground break-all">{created.signup_url}</p>
        </div>
      )}
    </div>
  )
}

// ─── List ────────────────────────────────────────────────────────────────────

function TrialCodesTable() {
  const { data: codes, isLoading, error } = useTrialCodes()
  const { mutateAsync: revoke, isPending: revoking } = useRevokeTrialCode()
  const [now] = useState(() => Date.now())
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handleRevoke(code: AdminTrialCode) {
    if (!window.confirm(`Revoke ${code.code}? The link will stop working.`)) return
    setRevokingId(code.id)
    try {
      await revoke(code.id)
      toast.success(`${code.code} revoked`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke code')
    } finally {
      setRevokingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load trial codes.</p>
  }

  if (!codes?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center">
        <Ticket className="mx-auto h-6 w-6 text-muted-foreground/60" />
        <p className="mt-2 text-sm text-muted-foreground">No trial codes yet. Generate one above.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Trial</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Used by</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map((code) => {
            const status = getStatus(code, now)
            return (
              <TableRow key={code.id}>
                <TableCell className="font-mono text-xs font-medium text-foreground whitespace-nowrap">{code.code}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{code.trial_days} days</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{code.note ?? '—'}</TableCell>
                <TableCell><StatusBadge code={code} now={now} /></TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {code.redeemed_at ? (
                    <div>
                      <p className="text-foreground">{code.studios?.name ?? code.redeemed_email ?? 'Unknown studio'}</p>
                      <p className="text-muted-foreground">{formatDate(code.redeemed_at)}</p>
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{code.expires_at ? formatDate(code.expires_at) : 'Never'}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(code.created_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(code.code, 'Code')} aria-label="Copy code">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy code</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(code.signup_url, 'Signup link')} aria-label="Copy signup link">
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy signup link</TooltipContent>
                    </Tooltip>
                    {status === 'available' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRevoke(code)}
                            disabled={revoking && revokingId === code.id}
                            aria-label="Revoke code"
                          >
                            {revoking && revokingId === code.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revoke</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function TrialCodesSection() {
  return (
    <div className="space-y-6">
      <CreateTrialCodeForm />
      <TrialCodesTable />
    </div>
  )
}

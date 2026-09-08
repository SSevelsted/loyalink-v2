'use client'

import { useState } from 'react'
import {
  useTrialCodes,
  useCreateTrialCode,
  useRevokeTrialCode,
  useUpdateTrialCode,
  type AdminTrialCode,
} from '@/hooks/use-admin'
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
import { Copy, Link2, Loader2, Ticket, Trash2, Check, Infinity as InfinityIcon, Ban } from 'lucide-react'
import { toast } from 'sonner'

type CodeStatus = 'available' | 'used_up' | 'expired'
type CodeKind = 'single' | 'campaign'

function getStatus(code: AdminTrialCode, now: number): CodeStatus {
  if (code.expires_at && new Date(code.expires_at).getTime() < now) return 'expired'
  if (code.max_uses != null && code.use_count >= code.max_uses) return 'used_up'
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

// ─── Status + usage ──────────────────────────────────────────────────────────

function StatusBadge({ code, now }: { code: AdminTrialCode; now: number }) {
  const status = getStatus(code, now)
  const map: Record<CodeStatus, { label: string; className: string }> = {
    available: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    used_up: { label: code.max_uses === 1 ? 'Used' : 'Limit reached', className: 'bg-primary/10 text-primary border-primary/20' },
    expired: { label: 'Expired', className: 'bg-secondary text-muted-foreground border-border' },
  }
  const config = map[status]
  return (
    <Badge variant="outline" className={`text-[10px] border whitespace-nowrap ${config.className}`}>
      {config.label}
    </Badge>
  )
}

function UsageCell({ code }: { code: AdminTrialCode }) {
  return (
    <span className="text-xs whitespace-nowrap text-foreground">
      {code.use_count}
      <span className="text-muted-foreground">
        {' / '}
        {code.max_uses == null ? '∞' : code.max_uses}
      </span>
    </span>
  )
}

// ─── Create form ─────────────────────────────────────────────────────────────

function CreateTrialCodeForm() {
  const [kind, setKind] = useState<CodeKind>('single')
  const [trialDays, setTrialDays] = useState('45')
  const [note, setNote] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [customCode, setCustomCode] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [created, setCreated] = useState<AdminTrialCode | null>(null)
  const [copied, setCopied] = useState<'code' | 'signup' | 'short' | null>(null)
  const { mutateAsync, isPending } = useCreateTrialCode()

  const isCampaign = kind === 'campaign'

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

    let uses: number | null = 1
    if (isCampaign) {
      uses = maxUses.trim() === '' ? null : Number(maxUses)
      if (uses !== null && (!Number.isInteger(uses) || uses < 1 || uses > 10_000)) {
        toast.error('Max uses must be a whole number between 1 and 10000, or empty for unlimited')
        return
      }
    }

    const code = customCode.trim().toUpperCase()
    if (code && !/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) {
      toast.error('Custom codes use 3-32 letters, digits or hyphens, e.g. RESOURCES45')
      return
    }

    try {
      const result = await mutateAsync({
        trialDays: days,
        note: note.trim() || undefined,
        expiresInDays: expiry,
        maxUses: uses,
        code: code || undefined,
      })
      setCreated(result)
      setCopied(null)
      setNote('')
      setCustomCode('')
      toast.success(`Trial code ${result.code} created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create trial code')
    }
  }

  async function handleCopy(target: 'code' | 'signup' | 'short') {
    if (!created) return
    const value =
      target === 'code' ? created.code : target === 'signup' ? created.signup_url : created.short_url
    const label = target === 'code' ? 'Code' : target === 'signup' ? 'Signup link' : 'Short link'
    await copyToClipboard(value, label)
    setCopied(target)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Generate a trial code</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          A studio signing up with the code or link gets the extended trial instead of the default 14 days.
        </p>
      </div>

      {/* Kind selector — a lead gets one use, a page CTA gets many */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { id: 'single', title: 'Single use', body: 'One studio. For a specific lead.' },
          { id: 'campaign', title: 'Campaign link', body: 'Reusable. For a page or newsletter.' },
        ] as const).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setKind(option.id)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              kind === option.id
                ? 'border-primary/60 bg-primary/8'
                : 'border-border/60 bg-secondary/30 hover:border-border'
            }`}
          >
            <p className="text-sm font-medium text-foreground">{option.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{option.body}</p>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
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
            <Label htmlFor="expiresInDays" className="text-xs text-muted-foreground">Link valid for</Label>
            <div className="relative">
              <Input
                id="expiresInDays"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Never expires"
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span>
            </div>
          </div>

          {isCampaign ? (
            <div className="space-y-1.5">
              <Label htmlFor="maxUses" className="text-xs text-muted-foreground">Max signups</Label>
              <Input
                id="maxUses"
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max signups</Label>
              <Input value="1" disabled readOnly />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs text-muted-foreground">Note (who or where it&apos;s for)</Label>
            <Input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isCampaign ? 'Resources page CTA' : 'Black Anchor Tattoo — met at convention'}
              maxLength={200}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customCode" className="text-xs text-muted-foreground">
              Custom code <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Input
              id="customCode"
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder={isCampaign ? 'RESOURCES45' : 'Auto-generated'}
              maxLength={32}
              autoComplete="off"
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
            Generate
          </Button>
        </div>
      </form>

      {created && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                New code · {created.trial_days}-day trial ·{' '}
                {created.max_uses == null ? 'unlimited signups' : `${created.max_uses} signup${created.max_uses === 1 ? '' : 's'}`}
              </p>
              <p className="font-mono text-sm font-semibold text-foreground truncate">{created.code}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => handleCopy('code')}>
                {copied === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Code
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleCopy('short')}>
                {copied === 'short' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                Short link
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleCopy('signup')}>
                {copied === 'signup' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                Signup link
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground break-all">
              <span className="text-foreground/70">Short (for a button or print):</span> {created.short_url}
            </p>
            <p className="text-[11px] text-muted-foreground break-all">
              <span className="text-foreground/70">Direct:</span> {created.signup_url}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Row actions ─────────────────────────────────────────────────────────────

function RowActions({ code, status }: { code: AdminTrialCode; status: CodeStatus }) {
  const { mutateAsync: revoke, isPending: revoking } = useRevokeTrialCode()
  const { mutateAsync: update, isPending: updating } = useUpdateTrialCode()

  async function handleRevoke() {
    if (!window.confirm(`Revoke ${code.code}? The link will stop working.`)) return
    try {
      await revoke(code.id)
      toast.success(`${code.code} revoked`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke code')
    }
  }

  // Closing a used campaign code caps it at what it has already issued, which
  // keeps the attribution rows while stopping any further signups.
  async function handleClose() {
    if (!window.confirm(`Stop ${code.code} from being used again? Existing signups keep their trial.`)) return
    try {
      await update({ id: code.id, maxUses: Math.max(code.use_count, 1) })
      toast.success(`${code.code} closed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close code')
    }
  }

  async function handleUncap() {
    try {
      await update({ id: code.id, maxUses: null })
      toast.success(`${code.code} is now unlimited`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update code')
    }
  }

  const busy = revoking || updating

  return (
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
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(code.short_url, 'Short link')} aria-label="Copy short link">
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy short link</TooltipContent>
      </Tooltip>

      {status === 'available' && code.use_count === 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleRevoke}
              disabled={busy}
              aria-label="Revoke code"
            >
              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Revoke</TooltipContent>
        </Tooltip>
      )}

      {status === 'available' && code.use_count > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleClose}
              disabled={busy}
              aria-label="Close code"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop further signups</TooltipContent>
        </Tooltip>
      )}

      {status === 'used_up' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleUncap}
              disabled={busy}
              aria-label="Make unlimited"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <InfinityIcon className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reopen as unlimited</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// ─── List ────────────────────────────────────────────────────────────────────

function RedeemedCell({ code }: { code: AdminTrialCode }) {
  const redemptions = code.trial_code_redemptions ?? []
  if (!redemptions.length) return <span className="text-xs text-muted-foreground">—</span>

  const [latest, ...rest] = redemptions
  return (
    <div className="text-xs whitespace-nowrap">
      <p className="text-foreground">{latest.studios?.name ?? latest.email ?? 'Unknown studio'}</p>
      <p className="text-muted-foreground">
        {formatDate(latest.redeemed_at)}
        {rest.length > 0 && ` · +${rest.length} more`}
      </p>
    </div>
  )
}

function TrialCodesTable() {
  const { data: codes, isLoading, error } = useTrialCodes()
  const [now] = useState(() => Date.now())

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
            <TableHead>Used</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Latest signup</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map((code) => (
            <TableRow key={code.id}>
              <TableCell className="font-mono text-xs font-medium text-foreground whitespace-nowrap">{code.code}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{code.trial_days} days</TableCell>
              <TableCell><UsageCell code={code} /></TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{code.note ?? '—'}</TableCell>
              <TableCell><StatusBadge code={code} now={now} /></TableCell>
              <TableCell><RedeemedCell code={code} /></TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{code.expires_at ? formatDate(code.expires_at) : 'Never'}</TableCell>
              <TableCell><RowActions code={code} status={getStatus(code, now)} /></TableCell>
            </TableRow>
          ))}
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

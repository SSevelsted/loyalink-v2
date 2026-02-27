'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStudios, useCreateStudio, useUpdateStudioSubscription } from '@/hooks/use-admin'
import { useStudio } from '@/hooks/use-studio'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, ChevronRight, Building2, Plus, Loader2, Copy, Check, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { Studio } from '@/types/database'

type SortKey = 'newest' | 'oldest' | 'customers' | 'name'
type StudioWithCounts = Studio & {
  studio_members: { count: number }[]
  customers: { count: number }[]
  wallet_passes: { count: number }[]
}

// ─── Status badge ────────────────────────────────────────────────────────────

function SubscriptionBadge({ status, trialEndsAt }: { status: Studio['subscription_status']; trialEndsAt: string | null }) {
  if (!status) return null

  const daysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const map: Record<string, { label: string; className: string }> = {
    trial: {
      label: daysLeft != null && daysLeft >= 0 ? `Trial · ${daysLeft}d left` : 'Trial expired',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    past_due: { label: 'Past due', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    cancelled: { label: 'Cancelled', className: 'bg-secondary text-muted-foreground border-border' },
    agency: { label: 'Agency', className: 'bg-primary/10 text-primary border-primary/20' },
  }

  const config = map[status] ?? map.trial
  return (
    <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex border ${config.className}`}>
      {config.label}
    </Badge>
  )
}

// ─── New Studio dialog ────────────────────────────────────────────────────────

function NewStudioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState<'trial' | 'agency'>('trial')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { mutateAsync, isPending } = useCreateStudio()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { inviteUrl: url } = await mutateAsync({ name, ownerEmail: email, type })
      setInviteUrl(url)
      toast.success(`Studio "${name}" created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create studio')
    }
  }

  function handleCopy() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setName('')
    setEmail('')
    setType('trial')
    setInviteUrl(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Studio</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-sm font-medium text-emerald-400 mb-0.5">Studio created</p>
              <p className="text-xs text-muted-foreground">Share this invite link with the studio owner.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Invite link</Label>
              <div className="flex items-center gap-2">
                <Input value={inviteUrl} readOnly className="text-xs font-mono bg-secondary/50 h-9" />
                <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="studio-name">Studio name</Label>
              <Input
                id="studio-name"
                placeholder="e.g. Black Anchor Tattoo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="owner-email">Owner email</Label>
              <Input
                id="owner-email"
                type="email"
                placeholder="owner@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">An invite link will be generated for this email.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="studio-type">Subscription type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'trial' | 'agency')}>
                <SelectTrigger id="studio-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">
                    <div>
                      <p className="font-medium">30-day free trial</p>
                      <p className="text-xs text-muted-foreground">Studio enters trial — credit card required to continue</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="agency">
                    <div>
                      <p className="font-medium">Agency client</p>
                      <p className="text-xs text-muted-foreground">100% off forever while working with the agency</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Create Studio
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Studio row actions ───────────────────────────────────────────────────────

function StudioActions({ studio }: { studio: StudioWithCounts }) {
  const { mutateAsync } = useUpdateStudioSubscription()

  async function handleAction(action: 'remove_agency' | 'cancel') {
    try {
      await mutateAsync({ studioId: studio.id, action })
      toast.success(action === 'remove_agency' ? 'Agency removed — studio enters 30-day trial' : 'Studio subscription cancelled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const isAgency = studio.is_agency
  const isCancelled = studio.subscription_status === 'cancelled'

  if (!isAgency && isCancelled) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {isAgency && (
          <DropdownMenuItem onClick={() => handleAction('remove_agency')} className="text-amber-400">
            Remove agency discount
          </DropdownMenuItem>
        )}
        {!isCancelled && (
          <>
            {isAgency && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => handleAction('cancel')} className="text-destructive">
              Cancel subscription
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function StudiosSection() {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [createOpen, setCreateOpen] = useState(false)
  const { data: studios, isLoading } = useAdminStudios(search)
  const { setCurrentStudioId } = useStudio()
  const router = useRouter()

  const sorted = useMemo(() => {
    if (!studios) return []
    const list = [...studios] as StudioWithCounts[]
    switch (sortKey) {
      case 'newest': return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'oldest': return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'customers': return list.sort((a, b) => (b.customers?.[0]?.count ?? 0) - (a.customers?.[0]?.count ?? 0))
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name))
      default: return list
    }
  }, [studios, sortKey])

  const handleSwitchToStudio = (studioId: string, studioName: string) => {
    setCurrentStudioId(studioId)
    router.push('/')
    toast.success(`Switched to ${studioName}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50 border-border/50 h-12"
          />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-[170px] h-12 bg-card/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="customers">Most Customers</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)} className="h-12 shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          New Studio
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {sorted.length} studio{sorted.length !== 1 ? 's' : ''}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : !sorted.length ? (
        <div className="py-20 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No studios found</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create first studio
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((studio) => {
            const s = studio as StudioWithCounts
            const customerCount = s.customers?.[0]?.count ?? 0
            const passCount = s.wallet_passes?.[0]?.count ?? 0
            const memberCount = s.studio_members?.[0]?.count ?? 0

            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-200 hover:bg-card hover:border-border/50 group min-h-[56px]"
              >
                <button
                  className="flex items-center gap-4 flex-1 text-left"
                  onClick={() => handleSwitchToStudio(s.id, s.name)}
                >
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.slug}</p>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <SubscriptionBadge status={s.subscription_status} trialEndsAt={s.trial_ends_at} />
                  <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                    {customerCount} customer{customerCount !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] hidden md:inline-flex">
                    {passCount} pass{passCount !== 1 ? 'es' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] hidden lg:inline-flex">
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                  <StudioActions studio={s} />
                  <button onClick={() => handleSwitchToStudio(s.id, s.name)}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewStudioDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

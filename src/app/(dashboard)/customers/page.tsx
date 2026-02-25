'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useCustomers, useCreateCustomer } from '@/hooks/use-customers'
import { useRewardsConfig } from '@/hooks/use-rewards'
import { useStudio } from '@/hooks/use-studio'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ArrowUpDown, Plus, Search, Users, ChevronRight, X } from 'lucide-react'
import { getTierDisplayName, getTierIndex } from '@/lib/format'
import { TIER_COLOR_PALETTE } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import type { Customer } from '@/types/database'

type SortKey = 'newest' | 'oldest' | 'name' | 'balance_high' | 'balance_low' | 'spend_high'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'balance_high', label: 'Balance (high)' },
  { value: 'balance_low', label: 'Balance (low)' },
  { value: 'spend_high', label: 'Total spend (high)' },
]

function sortCustomers(customers: Customer[], sort: SortKey): Customer[] {
  const sorted = [...customers]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'balance_high':
      return sorted.sort((a, b) => Number(b.balance) - Number(a.balance))
    case 'balance_low':
      return sorted.sort((a, b) => Number(a.balance) - Number(b.balance))
    case 'spend_high':
      return sorted.sort((a, b) => Number(b.total_real_spend) - Number(a.total_real_spend))
    default:
      return sorted
  }
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const { data: customers, isLoading } = useCustomers(search)
  const createCustomer = useCreateCustomer()
  const { data: rewardsConfig } = useRewardsConfig()
  const { currentStudio } = useStudio()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', loyalty_stage: '', cashback_rate: 0 })

  // Filters
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')

  const currencyConfig = getCurrencyConfig(
    (currentStudio?.settings?.currency as string) ?? 'kr'
  )

  const tiers = rewardsConfig?.tiers ?? []
  const baseTier = tiers[0]

  const handleCreate = async () => {
    const tier = tiers.find((t) => t.slug === form.loyalty_stage) ?? baseTier
    await createCustomer.mutateAsync({
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      loyalty_stage: tier?.slug,
      cashback_rate: tier?.cashback_rate,
    })
    setForm({ name: '', email: '', phone: '', loyalty_stage: '', cashback_rate: 0 })
    setOpen(false)
  }

  // Set of known tier slugs — customers with slugs not in this set are treated as base tier
  const knownTierSlugs = useMemo(() => new Set(tiers.map((t) => t.slug)), [tiers])

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    const filtered = customers.filter((c) => {
      if (tierFilter !== 'all') {
        const effectiveTier = knownTierSlugs.has(c.loyalty_stage) ? c.loyalty_stage : (tiers[0]?.slug ?? c.loyalty_stage)
        if (effectiveTier !== tierFilter) return false
      }
      if (statusFilter === 'purchased' && !c.has_purchased) return false
      if (statusFilter === 'new' && c.has_purchased) return false
      if (statusFilter === 'has_referrals' && c.referral_count === 0) return false
      return true
    })
    return sortCustomers(filtered, sortKey)
  }, [customers, tierFilter, statusFilter, sortKey, knownTierSlugs, tiers])

  const hasActiveFilters = tierFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setTierFilter('all')
    setStatusFilter('all')
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers?.length ?? 0} total customers
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer name"
                  className="bg-secondary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+45 12 34 56 78"
                  className="bg-secondary/50"
                />
              </div>
              {tiers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tier</Label>
                  <Select
                    value={form.loyalty_stage || (baseTier?.slug ?? '')}
                    onValueChange={(v) => setForm({ ...form, loyalty_stage: v })}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map((tier) => (
                        <SelectItem key={tier.slug} value={tier.slug}>
                          {tier.name} ({tier.cashback_rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleCreate} className="w-full" disabled={!form.name || createCustomer.isPending}>
                {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Filter bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50 border-border/50 h-12"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tier filter */}
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs bg-card/50 border-border/50">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {tiers.map((tier) => (
                <SelectItem key={tier.slug} value={tier.slug}>{tier.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs bg-card/50 border-border/50">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="purchased">Has Purchased</SelectItem>
              <SelectItem value="new">New (No Purchase)</SelectItem>
              <SelectItem value="has_referrals">Has Referrals</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[170px] h-9 text-xs bg-card/50 border-border/50">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3 w-3" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <>
              <div className="w-px h-5 bg-border/50" />
              {tierFilter !== 'all' && (
                <button
                  onClick={() => setTierFilter('all')}
                  className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {getTierDisplayName(tierFilter, rewardsConfig)}
                  <X className="h-3 w-3" />
                </button>
              )}
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {statusFilter === 'purchased' ? 'Has Purchased' : statusFilter === 'new' ? 'New' : 'Has Referrals'}
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results count when filtered */}
      {hasActiveFilters && customers?.length !== undefined && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredCustomers.length} of {customers.length} customers
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : !filteredCustomers.length ? (
        <div className="py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {customers?.length ? 'No customers match your filters' : 'No customers found'}
          </p>
          {customers?.length ? (
            <button onClick={clearFilters} className="text-sm text-primary hover:underline mt-2">
              Clear filters
            </button>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Add your first customer to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredCustomers.map((customer) => {
            const tierIdx = getTierIndex(customer.loyalty_stage, rewardsConfig)
            const palette = TIER_COLOR_PALETTE[tierIdx % TIER_COLOR_PALETTE.length]

            return (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-200 hover:bg-card hover:border-border/50 group min-h-[56px]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.email ?? customer.phone ?? 'No contact info'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-foreground">
                      {formatAmount(Number(customer.balance), currencyConfig)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider ${palette.bg} ${palette.text} ${palette.border}`}
                  >
                    {getTierDisplayName(customer.loyalty_stage, rewardsConfig)}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

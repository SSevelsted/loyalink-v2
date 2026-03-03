'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  ArrowLeftRight,
  ArrowUpDown,
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
  Hash,
  Search,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react'
import type { Transaction } from '@/types/database'
import { TRANSACTION_LABELS, TRANSACTION_META, groupByDateLabel, groupRelatedTransactions, type TransactionGroup } from '@/lib/format'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type TransactionWithCustomer = Transaction & { customers: { name: string } | null }

type DatePreset = '7d' | '30d' | '90d' | 'all'
type SortKey = 'newest' | 'oldest' | 'amount_high' | 'amount_low'
type TypeFilter = 'all' | Transaction['type']

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_high', label: 'Amount (high)' },
  { value: 'amount_low', label: 'Amount (low)' },
]

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'credit', label: 'Purchase Recorded' },
  { value: 'debit', label: 'Balance Redeemed' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'cashback', label: 'Cashback Earned' },
  { value: 'referral_commission', label: 'Referral Bonus' },
]


function isPositive(type: string) {
  return type === 'credit' || type === 'cashback' || type === 'referral_commission'
}

function getDateCutoff(preset: DatePreset): Date | null {
  if (preset === 'all') return null
  const d = new Date()
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  d.setDate(d.getDate() - days)
  return d
}

export default function TransactionsPage() {
  const { currentStudio } = useStudio()
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [selectedGroup, setSelectedGroup] = useState<TransactionGroup<TransactionWithCustomer> | null>(null)

  const currencyConfig = getCurrencyConfig(
    (currentStudio?.settings?.currency as string) ?? 'kr'
  )

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['all_transactions', currentStudio?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*, customers(name)')
        .eq('studio_id', currentStudio!.id)
        .order('created_at', { ascending: false })
        .limit(500)
      return (data ?? []) as TransactionWithCustomer[]
    },
    enabled: !!currentStudio,
  })

  const filtered = useMemo(() => {
    if (!transactions) return []

    let result = [...transactions]

    // Date filter
    const cutoff = getDateCutoff(datePreset)
    if (cutoff) {
      result = result.filter((tx) => new Date(tx.created_at) >= cutoff)
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((tx) => tx.type === typeFilter)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (tx) =>
          tx.customers?.name?.toLowerCase().includes(q) ||
          tx.description?.toLowerCase().includes(q) ||
          tx.type.toLowerCase().includes(q)
      )
    }

    // Sort
    switch (sortKey) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'amount_high':
        result.sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
        break
      case 'amount_low':
        result.sort((a, b) => Math.abs(Number(a.amount)) - Math.abs(Number(b.amount)))
        break
    }

    return result
  }, [transactions, datePreset, typeFilter, search, sortKey])

  // Summary stats based on filtered results
  const stats = useMemo(() => {
    const count = filtered.length
    const volume = filtered.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)
    const net = filtered.reduce((sum, tx) => {
      const amt = Math.abs(Number(tx.amount))
      return sum + (isPositive(tx.type) ? amt : -amt)
    }, 0)
    const avg = count > 0 ? volume / count : 0
    return { count, volume, net, avg }
  }, [filtered])

  const hasActiveFilters = typeFilter !== 'all' || datePreset !== 'all' || search.trim() !== ''

  const txGroups = useMemo(() => groupRelatedTransactions(filtered), [filtered])
  const grouped = useMemo(
    () => groupByDateLabel(txGroups.map((g) => ({ ...g, created_at: g.primary.created_at }))),
    [txGroups],
  )

  const clearFilters = () => {
    setTypeFilter('all')
    setDatePreset('all')
    setSearch('')
  }

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Transactions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {transactions?.length ?? 0} total transactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Count</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.count}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Volume</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatAmount(stats.volume, currencyConfig)}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Net Change</span>
            </div>
            <p className={`text-2xl font-bold ${stats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.net >= 0 ? '+' : ''}{formatAmount(stats.net, currencyConfig)}
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg. Amount</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.count > 0 ? formatAmount(stats.avg, currencyConfig) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50 border-border/50 h-12"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-[180px] h-9 text-xs bg-card/50 border-border/50">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date preset */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-card/50 border-border/50">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[160px] h-9 text-xs bg-card/50 border-border/50">
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
              {typeFilter !== 'all' && (
                <button
                  onClick={() => setTypeFilter('all')}
                  className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {TYPE_FILTERS.find((t) => t.value === typeFilter)?.label}
                  <X className="h-3 w-3" />
                </button>
              )}
              {datePreset !== 'all' && (
                <button
                  onClick={() => setDatePreset('all')}
                  className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  Last {datePreset}
                  <X className="h-3 w-3" />
                </button>
              )}
              {search.trim() && (
                <button
                  onClick={() => setSearch('')}
                  className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  &ldquo;{search}&rdquo;
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
      {hasActiveFilters && transactions?.length !== undefined && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {transactions.length} transactions
        </p>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="py-20 text-center">
          <ArrowLeftRight className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {transactions?.length ? 'No transactions match your filters' : 'No transactions yet'}
          </p>
          {transactions?.length ? (
            <button onClick={clearFilters} className="text-sm text-primary hover:underline mt-2">
              Clear filters
            </button>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Transactions will appear here as they happen</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">{label}</p>
              <div className="space-y-1">
                {items.map((group) => {
                  const tx = group.primary
                  const meta = TRANSACTION_META[tx.type as keyof typeof TRANSACTION_META] ?? TRANSACTION_META.adjustment
                  return (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedGroup(group)}
                      className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-200 hover:bg-card hover:border-border/50 group min-h-[56px] w-full text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${meta.icon_bg}`}>
                          <meta.icon className={`h-5 w-5 ${meta.icon_color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {tx.description ?? TRANSACTION_LABELS[tx.type] ?? tx.type}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.customers?.name ?? 'Unknown customer'} &middot; {new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} {new Date(tx.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {(group.cashback || group.balanceUsed) && (
                            <div className="flex items-center gap-2.5 mt-0.5">
                              {group.cashback && (
                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                  <Sparkles className="h-3 w-3 shrink-0" />
                                  +{formatAmount(Math.abs(Number(group.cashback.amount)), currencyConfig)}
                                </span>
                              )}
                              {group.balanceUsed && (
                                <span className="flex items-center gap-1 text-xs text-red-400">
                                  <Wallet className="h-3 w-3 shrink-0" />
                                  −{formatAmount(Math.abs(Number(group.balanceUsed.amount)), currencyConfig)} balance
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${meta.amount}`}>
                            {meta.sign}{formatAmount(Math.abs(Number(tx.amount)), currencyConfig)}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wider ${meta.badge}`}
                          >
                            {TRANSACTION_LABELS[tx.type] ?? tx.type}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Detail Sheet */}
      <Sheet open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Transaction Details</SheetTitle>
            <SheetDescription>
              Full details for this transaction
            </SheetDescription>
          </SheetHeader>

          {selectedGroup && (() => {
            const selectedTx = selectedGroup.primary
            const meta = TRANSACTION_META[selectedTx.type as keyof typeof TRANSACTION_META] ?? TRANSACTION_META.adjustment
            const createdAt = new Date(selectedTx.created_at)

            return (
              <div className="space-y-6 pt-4">
                {/* Amount highlight */}
                <div className="text-center py-4">
                  <p className={`text-4xl font-bold ${meta.amount}`}>
                    {meta.sign}{formatAmount(Math.abs(Number(selectedTx.amount)), currencyConfig)}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-xs uppercase tracking-wider mt-3 ${meta.badge}`}
                  >
                    {TRANSACTION_LABELS[selectedTx.type] ?? selectedTx.type}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* Customer */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Customer</p>
                      <Link
                        href={`/customers/${selectedTx.customer_id}`}
                        className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {selectedTx.customers?.name ?? 'Unknown'}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Date & Time</p>
                      <p className="text-sm font-medium text-foreground">
                        {createdAt.toLocaleDateString(undefined, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {createdAt.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Cashback earned (grouped) */}
                  {selectedGroup.cashback && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Cashback Earned</p>
                        <p className="text-sm font-medium text-amber-400">
                          +{formatAmount(Math.abs(Number(selectedGroup.cashback.amount)), currencyConfig)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Balance used (grouped) */}
                  {selectedGroup.balanceUsed && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Wallet className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance Used</p>
                        <p className="text-sm font-medium text-red-400">
                          −{formatAmount(Math.abs(Number(selectedGroup.balanceUsed.amount)), currencyConfig)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedTx.description && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Description</p>
                        <p className="text-sm text-foreground">{selectedTx.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Source customer (for referral commissions) */}
                  {selectedTx.source_customer_id && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Source Customer</p>
                        <Link
                          href={`/customers/${selectedTx.source_customer_id}`}
                          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View source customer
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Transaction ID */}
                  <div className="rounded-xl bg-secondary/30 px-3 py-2.5 mt-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Transaction ID</p>
                    <p className="text-xs font-mono text-muted-foreground">{selectedTx.id}</p>
                  </div>
                </div>
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}

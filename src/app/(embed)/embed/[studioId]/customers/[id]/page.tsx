'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, CreditCard, DollarSign, ShoppingBag, TrendingUp,
  Percent, CalendarDays, Share2, ArrowUpRight, CheckCircle2, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStudio } from '@/hooks/use-studio'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { getTierDisplayName, getTierIndex } from '@/lib/format'
import { rewardsConfigFromStudio } from '@/lib/embed-rewards'
import { TIER_COLOR_PALETTE } from '@/types/database'
import { MemberManageDialog } from '@/components/embed/member-manage-dialog'

type Customer = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  balance: number | null
  loyalty_stage: string | null
  cashback_rate: number | null
  total_real_spend: number | null
  referral_code: string | null
  created_at: string
}

type Transaction = {
  id: string
  type: string
  amount: number
  description: string | null
  created_at: string
}

type Referral = {
  id: string
  status: 'pending' | 'activated' | 'expired'
  total_commission_earned: number
  created_at: string
  referred_customer: { name: string | null } | null
}

type TierChange = {
  date: string
  from: string
  to: string
  cashbackRate?: number
}

const TYPE_COLORS: Record<string, string> = {
  credit: 'bg-emerald-500/10 text-emerald-400',
  debit: 'bg-red-500/10 text-red-400',
  cashback: 'bg-blue-500/10 text-blue-400',
  adjustment: 'bg-amber-500/10 text-amber-400',
  referral_commission: 'bg-violet-500/10 text-violet-400',
}

export default function EmbedCustomerProfilePage() {
  const params = useParams<{ studioId: string; id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { currentStudio } = useStudio()
  const studioId = params.studioId
  const customerId = params.id

  const currencyConfig = getCurrencyConfig((currentStudio?.settings?.currency as string) ?? 'kr')
  const rewardsConfig = rewardsConfigFromStudio(currentStudio)
  const backHref = `/embed/${studioId}/customers?token=${token}`
  const recordHref = `/embed/${studioId}/customers/${customerId}/record?token=${token}`

  const { data, isLoading, error } = useQuery({
    queryKey: ['embed-customer', studioId, customerId],
    queryFn: async () => {
      const qp = new URLSearchParams({ studioId, token: token! })
      const res = await fetch(`/api/embed/customers/${customerId}?${qp}`)
      if (!res.ok) throw new Error('Failed to load customer')
      return res.json()
    },
    enabled: !!studioId && !!customerId && !!token,
  })

  const customer: Customer | null = data?.customer ?? null
  const transactions: Transaction[] = data?.transactions ?? []
  const referrals: Referral[] = data?.referrals ?? []
  const tierHistory: TierChange[] = data?.tierHistory ?? []
  const canManage: boolean = data?.canManage ?? false

  const stats = useMemo(() => {
    const txs: Transaction[] = data?.transactions ?? []
    const purchases = txs.filter((tx) => tx.type === 'credit')
    const purchaseCount = purchases.length
    const purchaseTotal = purchases.reduce((sum, tx) => sum + Number(tx.amount), 0)
    return { purchaseCount, avgSpend: purchaseCount > 0 ? purchaseTotal / purchaseCount : 0 }
  }, [data])

  const referralStats = useMemo(() => {
    const refs: Referral[] = data?.referrals ?? []
    return {
      sent: refs.length,
      activated: refs.filter((r) => r.status === 'activated').length,
      pending: refs.filter((r) => r.status === 'pending').length,
      totalEarned: refs.reduce((sum, r) => sum + Number(r.total_commission_earned ?? 0), 0),
    }
  }, [data])

  if (!token) {
    return (
      <div className="flex min-h-[640px] items-center justify-center text-sm text-muted-foreground">
        Missing embed access.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-secondary/50" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="max-w-sm mx-auto pt-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Button variant="secondary" asChild>
          <Link href={backHref}>Back to customers</Link>
        </Button>
      </div>
    )
  }

  const tierIdx = getTierIndex(customer.loyalty_stage ?? '', rewardsConfig)
  const tierPalette = TIER_COLOR_PALETTE[tierIdx % TIER_COLOR_PALETTE.length]
  const tierLabel = getTierDisplayName(customer.loyalty_stage ?? '', rewardsConfig)
  const memberSince = new Date(customer.created_at)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Customers
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xl font-semibold text-foreground shrink-0">
          {(customer.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground truncate">{customer.name ?? 'Unnamed customer'}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {customer.email ?? customer.phone ?? 'No contact info'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wider ${tierPalette.bg} ${tierPalette.text} ${tierPalette.border}`}
            >
              {tierLabel}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManage && token && (
            <MemberManageDialog
              studioId={studioId}
              token={token}
              customerId={customerId}
              currentTier={customer.loyalty_stage ?? ''}
              currentCashback={customer.cashback_rate ?? 0}
              currentBalance={Number(customer.balance ?? 0)}
              tiers={rewardsConfig.tiers}
            />
          )}
          <Button asChild>
            <Link href={recordHref}>
              <Plus className="h-4 w-4" />
              Record Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatAmount(Number(customer.balance ?? 0), currencyConfig)}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Lifetime Spend</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatAmount(Number(customer.total_real_spend ?? 0), currencyConfig)}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Purchases</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.purchaseCount}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg. Spend</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.purchaseCount > 0 ? formatAmount(stats.avgSpend, currencyConfig) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Cashback</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{customer.cashback_rate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Member Since</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {memberSince.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals + Tier History */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Referrals */}
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="h-4 w-4 text-blue-400" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-2xl bg-secondary/30 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{referralStats.sent}</p>
                <p className="text-[11px] text-muted-foreground">Sent</p>
              </div>
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-2.5 text-center">
                <p className="text-lg font-bold text-emerald-400">{referralStats.activated}</p>
                <p className="text-[11px] text-muted-foreground">Activated</p>
              </div>
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/10 p-2.5 text-center">
                <p className="text-lg font-bold text-amber-400">{referralStats.pending}</p>
                <p className="text-[11px] text-muted-foreground">Pending</p>
              </div>
            </div>

            {referralStats.totalEarned > 0 && (
              <div className="rounded-2xl bg-blue-500/5 border border-blue-500/10 px-3 py-2 mb-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Commission earned</span>
                <span className="text-sm font-semibold text-blue-400">{formatAmount(referralStats.totalEarned, currencyConfig)}</span>
              </div>
            )}

            {referrals.length > 0 ? (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {referrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-foreground shrink-0">
                        {ref.referred_customer?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm text-foreground truncate">{ref.referred_customer?.name ?? 'Unknown'}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        ref.status === 'activated'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : ref.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {ref.status === 'activated' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {ref.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {ref.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No referrals yet</p>
            )}
          </CardContent>
        </Card>

        {/* Tier History */}
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-amber-400" />
              Tier History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-2xl border ${tierPalette.border} ${tierPalette.bg} px-3 py-2.5 mb-4 flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-semibold ${tierPalette.text}`}>{tierLabel}</p>
                <p className="text-xs text-muted-foreground">Current tier</p>
              </div>
              <span className={`text-lg font-bold ${tierPalette.text}`}>{customer.cashback_rate ?? 0}%</span>
            </div>

            {tierHistory.length > 0 ? (
              <div className="space-y-0">
                {tierHistory.map((change, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    {i < tierHistory.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/50" />
                    )}
                    <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowUpRight className="h-3 w-3 text-amber-400" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-foreground">
                        {change.from} <span className="text-muted-foreground mx-1">&rarr;</span> {change.to}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(change.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {change.cashbackRate != null && ` · ${change.cashbackRate}% cashback`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Joined as {tierLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {memberSince.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl bg-secondary/20 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate capitalize">
                      {t.description || t.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={TYPE_COLORS[t.type] ?? 'bg-secondary text-secondary-foreground'}>
                      {t.type.replace(/_/g, ' ')}
                    </Badge>
                    <span className={`text-sm font-semibold tabular-nums ${Number(t.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{formatAmount(Number(t.amount), currencyConfig)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

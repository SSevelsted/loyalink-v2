'use client'

import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Users, Briefcase, Heart, Repeat, UserPlus, TrendingUp, TrendingDown } from 'lucide-react'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import type { LucideIcon } from 'lucide-react'

type KpiCardsProps = {
  data: AnalyticsDashboard
  showTrend: boolean
}

type KpiItem = {
  label: string
  value: string
  change: number | null
  icon: LucideIcon
  color: string
  iconBg: string
}

function TrendBadge({ change, showTrend }: { change: number | null; showTrend: boolean }) {
  if (!showTrend || change === null) return null
  return (
    <div className={`flex items-center gap-1 mt-1.5 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="text-xs font-medium">
        {change >= 0 ? '+' : ''}{change}%
      </span>
      <span className="text-xs text-muted-foreground">vs prev period</span>
    </div>
  )
}

export function KpiCards({ data, showTrend }: KpiCardsProps) {
  const cfg = getCurrencyConfig(data.currency)

  const primaryKpis: KpiItem[] = [
    {
      label: 'Revenue',
      value: formatAmount(data.kpis.totalRevenue, cfg),
      change: data.kpis.revenueChange,
      icon: DollarSign,
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    {
      label: 'Active Customers',
      value: data.kpis.activeCustomers.toLocaleString(),
      change: data.kpis.activeCustomersChange,
      icon: Users,
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
    {
      label: 'Avg Deal Size',
      value: formatAmount(data.kpis.avgDealSize, cfg),
      change: data.kpis.avgDealSizeChange,
      icon: Briefcase,
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
  ]

  const secondaryKpis: KpiItem[] = [
    {
      label: 'Customer Lifetime Value',
      value: formatAmount(data.kpis.clv, cfg),
      change: null,
      icon: Heart,
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
    },
    {
      label: 'Referral Revenue',
      value: formatAmount(data.kpis.referralRevenue, cfg),
      change: data.kpis.referralRevenueChange,
      icon: UserPlus,
      color: 'text-rose-400',
      iconBg: 'bg-rose-500/10',
    },
    {
      label: 'Repeat Purchase Rate',
      value: `${data.programHealth.repeatPurchaseRate}%`,
      change: data.kpis.repeatPurchaseRateChange,
      icon: Repeat,
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Primary KPIs — hero cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {primaryKpis.map((kpi) => (
          <Card key={kpi.label} variant="glass-hover" className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-8 w-8 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
              <TrendBadge change={kpi.change} showTrend={showTrend} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs — compact row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {secondaryKpis.map((kpi) => (
          <Card key={kpi.label} variant="glass" className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-6 w-6 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                  <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <TrendBadge change={kpi.change} showTrend={showTrend} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[140px] rounded-2xl animate-shimmer" />
        ))}
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[110px] rounded-2xl animate-shimmer" />
        ))}
      </div>
    </div>
  )
}

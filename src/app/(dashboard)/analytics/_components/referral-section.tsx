'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Users, TrendingUp, DollarSign, UserCheck, Trophy } from 'lucide-react'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

const chartConfig = {
  referrals: { label: 'Referrals', color: 'var(--chart-3)' },
  activated: { label: 'Activated', color: 'var(--chart-1)' },
} satisfies ChartConfig

type ReferralSectionProps = {
  data: AnalyticsDashboard
}

function formatDateLabel(date: string, granularity: string) {
  const d = new Date(date)
  if (granularity === 'daily') return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  if (granularity === 'weekly') return `W${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-zinc-300',
  3: 'text-amber-700',
}

export function ReferralSection({ data }: ReferralSectionProps) {
  const cfg = getCurrencyConfig(data.currency)
  const { referrals } = data

  const miniKpis = [
    {
      label: 'Total Referrals',
      value: referrals.totalReferrals.toLocaleString(),
      subtitle: `${referrals.activatedReferrals} activated`,
      icon: Users,
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
    {
      label: 'Activation Rate',
      value: `${referrals.activationRate}%`,
      subtitle: 'of referrals activated',
      icon: TrendingUp,
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    {
      label: 'Revenue from Referrals',
      value: formatAmount(referrals.totalRevenueFromReferred, cfg),
      subtitle: 'all-time from referred customers',
      icon: DollarSign,
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
    },
    {
      label: 'Referral Conversion',
      value: `${referrals.referralConversionRate}%`,
      subtitle: 'of referred customers purchased',
      icon: UserCheck,
      color: 'text-rose-400',
      iconBg: 'bg-rose-500/10',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <h2 className="text-lg font-semibold text-foreground">Referral Program</h2>
      </div>

      {/* Mini KPI Row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {miniKpis.map((kpi) => (
          <Card key={kpi.label} variant="glass-hover" className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-6 w-6 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                  <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{kpi.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column: Leaderboard + Growth Chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">Top Referrers</h3>
            </div>
            {referrals.leaderboard.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No referrals yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Referrals will appear here once customers start sharing
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Refs</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.leaderboard.map((entry) => (
                    <TableRow key={entry.customerId}>
                      <TableCell className={`font-bold ${RANK_STYLES[entry.rank] ?? 'text-muted-foreground'}`}>
                        {entry.rank}
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-right">{entry.referralCount}</TableCell>
                      <TableCell className="text-right">{formatAmount(entry.totalCommission, cfg)}</TableCell>
                      <TableCell className="text-right">{formatAmount(entry.revenueGenerated, cfg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Referral Growth Chart */}
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Referral Growth</h3>
            {referrals.growthChart.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No referral data yet</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <AreaChart data={referrals.growthChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="fillReferrals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-referrals)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-referrals)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillActivated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-activated)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-activated)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatDateLabel(v, data.granularity)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={30}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="referrals"
                    stroke="var(--color-referrals)"
                    fill="url(#fillReferrals)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="activated"
                    stroke="var(--color-activated)"
                    fill="url(#fillActivated)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

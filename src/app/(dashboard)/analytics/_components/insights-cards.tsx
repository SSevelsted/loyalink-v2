'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Timer, PiggyBank, Smartphone, Clock, Wallet } from 'lucide-react'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type InsightsCardsProps = {
  data: AnalyticsDashboard
}

export function InsightsCards({ data }: InsightsCardsProps) {
  const cfg = getCurrencyConfig(data.currency)
  const { insights } = data

  const peakHourFormatted = insights.peakHour !== null ? `${String(insights.peakHour).padStart(2, '0')}:00` : null
  const peakActivity = insights.peakDay && peakHourFormatted
    ? `${insights.peakDay}s at ${peakHourFormatted}`
    : insights.peakDay ?? '—'

  const firstPurchase = insights.timeToFirstPurchase !== null
    ? `${Math.round(insights.timeToFirstPurchase)}d`
    : '—'
  const secondPurchase = insights.timeToSecondPurchase !== null
    ? `${Math.round(insights.timeToSecondPurchase)}d`
    : '—'
  const customerJourney = insights.timeToFirstPurchase !== null
    ? `${firstPurchase} → ${secondPurchase}`
    : '—'

  const savingsPercent = insights.flatDiscountCost > 0
    ? Math.round(((insights.flatDiscountCost - insights.loyaltyCost) / insights.flatDiscountCost) * 100)
    : null
  const loyaltySavings = savingsPercent !== null ? `${savingsPercent}% cheaper` : '—'
  const loyaltySavingsSubtitle = insights.flatDiscountCost > 0
    ? `${formatAmount(insights.loyaltyCost, cfg)} vs ${formatAmount(insights.flatDiscountCost, cfg)} flat discount`
    : 'Not enough data'

  const totalPasses = insights.platformSplit.reduce((sum, p) => sum + p.count, 0)
  const platformLabel = insights.platformSplit.length > 0 && totalPasses > 0
    ? insights.platformSplit.map((p) => `${p.platform === 'apple' ? 'Apple' : 'Google'}: ${Math.round((p.count / totalPasses) * 100)}%`).join(' / ')
    : '—'
  const installRate = data.programHealth.passInstallRate
  const platformSubtitle = `${data.totals.passes} passes · ${installRate}% installed`

  const purchaseCadence = insights.avgTimeBetweenPurchases !== null
    ? `${Math.round(insights.avgTimeBetweenPurchases)}d`
    : '—'

  const cards = [
    {
      icon: Calendar,
      label: 'Peak Activity',
      value: peakActivity,
      subtitle: 'Busiest day and time for purchases',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
    {
      icon: Timer,
      label: 'Customer Journey',
      value: customerJourney,
      subtitle: 'Median time to 1st → 2nd purchase',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
    {
      icon: PiggyBank,
      label: 'Loyalty Savings',
      value: loyaltySavings,
      subtitle: loyaltySavingsSubtitle,
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    {
      icon: Clock,
      label: 'Purchase Cadence',
      value: purchaseCadence,
      subtitle: 'Median days between repeat purchases',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10',
    },
    {
      icon: Wallet,
      label: 'Outstanding Balance',
      value: formatAmount(data.balances.outstandingBalance, cfg),
      subtitle: 'Total unredeemed rewards',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
    {
      icon: Smartphone,
      label: 'Platform Split & Passes',
      value: platformLabel,
      subtitle: platformSubtitle,
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} variant="glass-hover" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-7 w-7 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

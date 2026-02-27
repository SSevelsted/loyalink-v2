'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  Clock,
  Timer,
  Users,
  Smartphone,
  Globe,
  PiggyBank,
  ArrowRight,
} from 'lucide-react'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type InsightsSectionProps = {
  data: AnalyticsDashboard
}

export function InsightsSection({ data }: InsightsSectionProps) {
  const cfg = getCurrencyConfig(data.currency)
  const { insights } = data

  const items = [
    {
      icon: Calendar,
      label: 'Peak Day',
      value: insights.peakDay ?? '—',
      subtitle: 'Most active day of the week',
    },
    {
      icon: Clock,
      label: 'Peak Hour',
      value: insights.peakHour !== null ? `${String(insights.peakHour).padStart(2, '0')}:00` : '—',
      subtitle: 'Busiest time of day',
    },
    {
      icon: Timer,
      label: 'Time to 1st Purchase',
      value: insights.timeToFirstPurchase !== null
        ? `${Math.round(insights.timeToFirstPurchase)} days`
        : '—',
      subtitle: 'Median from signup to first buy',
    },
    {
      icon: ArrowRight,
      label: 'Time to 2nd Purchase',
      value: insights.timeToSecondPurchase !== null
        ? `${Math.round(insights.timeToSecondPurchase)} days`
        : '—',
      subtitle: 'Median between 1st and 2nd buy',
    },
    {
      icon: Users,
      label: 'Referral Activation',
      value: `${insights.referralActivationRate}%`,
      subtitle: `${insights.activatedReferrals} / ${insights.totalReferrals} referrals`,
    },
    {
      icon: PiggyBank,
      label: 'Loyalty vs 10% Discount',
      value: insights.flatDiscountCost > 0
        ? `${Math.round(((insights.flatDiscountCost - insights.loyaltyCost) / insights.flatDiscountCost) * 100)}% saved`
        : '—',
      subtitle: insights.flatDiscountCost > 0
        ? `${formatAmount(insights.loyaltyCost, cfg)} vs ${formatAmount(insights.flatDiscountCost, cfg)}`
        : 'Not enough data',
    },
    {
      icon: Smartphone,
      label: 'Platform Split',
      value: insights.platformSplit.length > 0
        ? insights.platformSplit.map((p) => `${p.platform === 'apple' ? 'Apple' : 'Google'}: ${p.count}`).join(' / ')
        : '—',
      subtitle: `${data.totals.passes} total active passes`,
    },
    {
      icon: Globe,
      label: 'Landing Conversion',
      value: `${insights.landingConversion}%`,
      subtitle: `${insights.landingSignups} signups / ${insights.landingViews} views`,
    },
  ]

  return (
    <Card variant="glass" className="rounded-2xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Insights</h3>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold text-foreground whitespace-nowrap">{item.value}</p>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

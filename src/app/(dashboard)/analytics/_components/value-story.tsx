'use client'

import { RotateCcw, Users, Percent } from 'lucide-react'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type ValueStoryProps = {
  data: AnalyticsDashboard
}

export function ValueStory({ data }: ValueStoryProps) {
  const cfg = getCurrencyConfig(data.currency)
  const { valueStory, balances } = data

  const hasAnyValue =
    valueStory.returningRevenuePercent > 0 ||
    valueStory.referralPayback !== null ||
    balances.redemptionRate > 0

  if (!hasAnyValue) return null

  const cards = [
    {
      icon: RotateCcw,
      value: `${valueStory.returningRevenuePercent}%`,
      label: 'Returning Revenue',
      description: valueStory.returningRevenue > 0
        ? `${formatAmount(valueStory.returningRevenue, cfg)} from customers who came back`
        : 'Revenue from repeat customers will appear here',
      accentFrom: 'from-blue-500/20',
      accentTo: 'to-blue-500/0',
      iconColor: 'text-blue-400',
    },
    {
      icon: Users,
      value: valueStory.referralPayback !== null ? `${valueStory.referralPayback}x` : '—',
      label: 'Referral Payback',
      description: valueStory.referralPayback !== null
        ? `Each 1 ${cfg.symbol} in commissions generated ${valueStory.referralPayback} ${cfg.symbol} from referred customers`
        : 'Referral revenue vs commission will appear here',
      accentFrom: 'from-violet-500/20',
      accentTo: 'to-violet-500/0',
      iconColor: 'text-violet-400',
    },
    {
      icon: Percent,
      value: `${balances.redemptionRate}%`,
      label: 'Redemption Rate',
      description: balances.totalEarned > 0
        ? `${formatAmount(balances.totalRedeemed, cfg)} redeemed of ${formatAmount(balances.totalEarned, cfg)} earned — lower means your effective discount is cheaper`
        : 'Reward redemption data will appear once customers earn and spend rewards',
      accentFrom: 'from-emerald-500/20',
      accentTo: 'to-emerald-500/0',
      iconColor: 'text-emerald-400',
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative rounded-2xl overflow-hidden glass-card p-5"
        >
          {/* Gradient accent at top */}
          <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${card.accentFrom} via-transparent ${card.accentTo}`} />

          <div className="flex items-center gap-2 mb-3">
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {card.label}
            </span>
          </div>

          <p className="text-3xl font-bold text-foreground">{card.value}</p>

          <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed">
            {card.description}
          </p>
        </div>
      ))}
    </div>
  )
}

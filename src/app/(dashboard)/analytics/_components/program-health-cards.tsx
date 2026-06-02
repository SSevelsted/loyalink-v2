'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type ProgramHealthCardsProps = {
  data: AnalyticsDashboard
}

export function ProgramHealthCards({ data }: ProgramHealthCardsProps) {
  const { programHealth } = data
  const cfg = getCurrencyConfig(data.currency)

  const metrics = [
    {
      label: 'Pass Install Rate',
      value: `${programHealth.passInstallRate}%`,
      subtitle: `${programHealth.passesInstalled} / ${programHealth.passesTotal} passes`,
      progress: programHealth.passInstallRate,
      color: 'bg-emerald-400',
    },
    {
      label: 'Uninstall Rate',
      value: `${programHealth.passUninstallRate}%`,
      subtitle: `${programHealth.passesUninstalled} of ${programHealth.passesEverInstalled} removed`,
      progress: programHealth.passUninstallRate,
      color: 'bg-red-400',
    },
    {
      label: 'Repeat Purchase Rate',
      value: `${programHealth.repeatPurchaseRate}%`,
      subtitle: `customers who bought more than once`,
      progress: programHealth.repeatPurchaseRate,
      color: 'bg-blue-400',
    },
    {
      label: 'Avg Transaction',
      value: formatAmount(data.kpis.avgTransactionValue, cfg),
      subtitle: `across ${programHealth.purchasersCount} purchasing customers`,
      progress: Math.min((data.kpis.avgTransactionValue / (data.kpis.avgDealSize || 1)) * 100, 100),
      color: 'bg-amber-400',
    },
    {
      label: 'Purchase Frequency',
      value: `${programHealth.purchaseFrequency}x`,
      subtitle: 'avg purchases per customer',
      progress: Math.min(programHealth.purchaseFrequency * 20, 100),
      color: 'bg-violet-400',
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => (
        <Card key={metric.label} variant="glass-hover" className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">{metric.label}</p>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{metric.subtitle}</p>
            <div className="h-1 rounded-full bg-secondary mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${metric.color} transition-all duration-500`}
                style={{ width: `${Math.min(metric.progress, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ProgramHealthSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-[130px] rounded-2xl animate-shimmer" />
      ))}
    </div>
  )
}

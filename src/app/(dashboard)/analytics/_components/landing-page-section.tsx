'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Eye, UserPlus, TrendingUp } from 'lucide-react'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'

type LandingPageSectionProps = {
  data: AnalyticsDashboard
}

export function LandingPageSection({ data }: LandingPageSectionProps) {
  const { insights } = data

  if (insights.landingViews === 0 && insights.landingSignups === 0) return null

  const cards = [
    {
      icon: Eye,
      label: 'Page Views',
      value: insights.landingViews.toLocaleString(),
      subtitle: 'Total landing page views',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
    {
      icon: UserPlus,
      label: 'Sign-ups',
      value: insights.landingSignups.toLocaleString(),
      subtitle: 'Customers joined via landing page',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Conversion Rate',
      value: `${insights.landingConversion}%`,
      subtitle: 'Visitors who signed up',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
        <h2 className="text-lg font-semibold text-foreground">Landing Page</h2>
      </div>

      {/* Mini KPI Row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} variant="glass-hover" className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-6 w-6 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-3 w-3 ${card.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

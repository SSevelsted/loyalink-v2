'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { TIER_COLOR_PALETTE } from '@/types/database'

type TierDistributionChartProps = {
  data: AnalyticsDashboard
}

export function TierDistributionChart({ data }: TierDistributionChartProps) {
  const chartData = data.charts.tierDistribution.map((item, i) => ({
    ...item,
    fill: TIER_COLOR_PALETTE[i % TIER_COLOR_PALETTE.length].hex,
  }))

  const chartConfig = chartData.reduce<ChartConfig>((acc, item) => {
    acc[item.tier] = { label: item.tier, color: item.fill }
    return acc
  }, {})

  if (chartData.length === 0) {
    return (
      <Card variant="glass" className="rounded-2xl">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tier Distribution</h3>
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No customer data yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass" className="rounded-2xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Tier Distribution</h3>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="tier"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={80}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

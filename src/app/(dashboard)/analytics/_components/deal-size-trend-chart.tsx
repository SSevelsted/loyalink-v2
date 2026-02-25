'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig } from '@/lib/currency'

const chartConfig = {
  avgDealSize: { label: 'Avg Deal Size', color: 'var(--chart-4)' },
} satisfies ChartConfig

type Props = {
  data: AnalyticsDashboard
}

function formatDateLabel(date: string, granularity: string) {
  const d = new Date(date)
  if (granularity === 'daily') return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  if (granularity === 'weekly') return `W${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

export function DealSizeTrendChart({ data }: Props) {
  const cfg = getCurrencyConfig(data.currency)

  if (data.charts.dealSizeTrend.length === 0) {
    return (
      <Card variant="glass" className="rounded-2xl">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Deal Size Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Average deal size over time</p>
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No deal data yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass" className="rounded-2xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Deal Size Trend</h3>
        <p className="text-xs text-muted-foreground mb-4">Average deal size over time</p>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <AreaChart data={data.charts.dealSizeTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fillDealSize" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-avgDealSize)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-avgDealSize)" stopOpacity={0.05} />
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
              tickFormatter={(v) => `${v} ${cfg.symbol}`}
              tick={{ fontSize: 11 }}
              width={60}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="avgDealSize"
              stroke="var(--color-avgDealSize)"
              fill="url(#fillDealSize)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

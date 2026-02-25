'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { getCurrencyConfig } from '@/lib/currency'

const chartConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
  cashback: { label: 'Cashback', color: 'var(--chart-2)' },
} satisfies ChartConfig

type RevenueChartProps = {
  data: AnalyticsDashboard
}

function formatDateLabel(date: string, granularity: string) {
  const d = new Date(date)
  if (granularity === 'daily') return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  if (granularity === 'weekly') return `W${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

export function RevenueChart({ data }: RevenueChartProps) {
  const cfg = getCurrencyConfig(data.currency)

  if (data.charts.revenue.length === 0) {
    return (
      <Card variant="glass" className="rounded-2xl">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Over Time</h3>
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No revenue data yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass" className="rounded-2xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Over Time</h3>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={data.charts.revenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cashback" fill="var(--color-cashback)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

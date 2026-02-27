'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import type { AnalyticsDashboard } from '@/hooks/use-analytics'
import { TRANSACTION_LABELS } from '@/lib/format'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

type TransactionBreakdownChartProps = {
  data: AnalyticsDashboard
}

export function TransactionBreakdownChart({ data }: TransactionBreakdownChartProps) {
  const chartData = data.charts.transactionBreakdown.map((item) => ({
    ...item,
    name: TRANSACTION_LABELS[item.type] ?? item.type,
  }))

  const chartConfig = chartData.reduce<ChartConfig>((acc, item, i) => {
    acc[item.name] = { label: item.name, color: COLORS[i % COLORS.length] }
    return acc
  }, {})

  if (chartData.length === 0) {
    return (
      <Card variant="glass" className="rounded-2xl">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Transaction Types</h3>
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass" className="rounded-2xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Transaction Types</h3>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

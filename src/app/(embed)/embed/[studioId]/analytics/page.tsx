'use client'

import { useStudio } from '@/hooks/use-studio'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EmbedAnalytics() {
  const { currentStudio } = useStudio()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const studioId = currentStudio?.id

  const { data: stats, isLoading } = useQuery({
    queryKey: ['embed-analytics', studioId],
    queryFn: async () => {
      const res = await fetch(`/api/embed/stats?studioId=${studioId}&token=${token}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!studioId && !!token,
  })

  const kpis = stats?.kpis
  const currency = stats?.currency ?? 'kr'

  const metrics = [
    { label: 'Total Revenue (30d)', value: kpis ? `${kpis.total_revenue} ${currency}` : '—' },
    { label: 'Active Customers (30d)', value: kpis?.active_customers ?? '—' },
    { label: 'Total Customers', value: kpis?.total_customers ?? '—' },
    { label: 'Outstanding Balance', value: kpis ? `${kpis.outstanding_balance} ${currency}` : '—' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Analytics</h1>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            For detailed analytics with charts, visit the full Loyalink dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

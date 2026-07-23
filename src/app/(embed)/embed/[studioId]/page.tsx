'use client'

import { useStudio } from '@/hooks/use-studio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ArrowLeftRight, Wallet, TrendingUp } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

export default function EmbedOverview() {
  const { currentStudio } = useStudio()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const studioId = currentStudio?.id

  const { data: stats, isLoading } = useQuery({
    queryKey: ['embed-stats', studioId],
    queryFn: async () => {
      const res = await fetch(`/api/embed/stats?studioId=${studioId}&token=${token}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    enabled: !!studioId && !!token,
  })

  const kpis = stats?.kpis
  const currencyConfig = getCurrencyConfig(stats?.currency ?? 'kr')

  const cards = [
    { label: 'Total customers', value: kpis?.total_customers ?? '—', icon: Users },
    { label: 'Active passes', value: kpis?.active_passes ?? '—', icon: Wallet },
    {
      label: 'Total balance',
      value: kpis ? formatAmount(kpis.outstanding_balance, currencyConfig) : '—',
      icon: TrendingUp,
    },
    { label: 'Total transactions', value: kpis?.total_transactions ?? '—', icon: ArrowLeftRight },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        {currentStudio?.name ?? 'Loyalty Program'}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {isLoading ? (
                    <span className="inline-block h-7 w-16 rounded bg-secondary/50 animate-pulse" />
                  ) : (
                    card.value
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

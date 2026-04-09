'use client'

import { useStudio } from '@/hooks/use-studio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ArrowLeftRight, TrendingUp, Wallet } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export default function EmbedOverview() {
  const { currentStudio } = useStudio()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const studioId = currentStudio?.id

  const { data: stats } = useQuery({
    queryKey: ['embed-stats', studioId],
    queryFn: async () => {
      const res = await fetch(`/api/embed/stats?studioId=${studioId}&token=${token}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    enabled: !!studioId && !!token,
  })

  const kpis = stats?.kpis

  const cards = [
    { label: 'Total Customers', value: kpis?.total_customers ?? '—', icon: Users, href: 'customers' },
    { label: 'Active Customers', value: kpis?.active_customers ?? '—', icon: TrendingUp, href: 'analytics' },
    { label: 'Revenue (30d)', value: kpis?.total_revenue ? `${kpis.total_revenue} ${stats?.currency ?? 'kr'}` : '—', icon: ArrowLeftRight, href: 'transactions' },
    { label: 'Outstanding Balance', value: kpis?.outstanding_balance ? `${kpis.outstanding_balance} ${stats?.currency ?? 'kr'}` : '—', icon: Wallet, href: 'wallet' },
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
            <Link key={card.label} href={`/embed/${studioId}/${card.href}?token=${token}`}>
              <Card className="glass-card hover:border-primary/20 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Customers', desc: 'View and manage loyalty members', href: 'customers', icon: Users },
          { label: 'Transactions', desc: 'Transaction history and processing', href: 'transactions', icon: ArrowLeftRight },
          { label: 'Wallet', desc: 'Card design and landing page', href: 'wallet', icon: Wallet },
          { label: 'Analytics', desc: 'Revenue and engagement metrics', href: 'analytics', icon: TrendingUp },
          { label: 'Settings', desc: 'Rewards, referrals, and studio config', href: 'settings', icon: TrendingUp },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={`/embed/${studioId}/${item.href}?token=${token}`}>
              <Card className="glass-card hover:border-primary/20 transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

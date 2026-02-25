'use client'

import { useAdminStats, useAdminActivity } from '@/hooks/use-admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  Wallet,
  TrendingUp,
  Megaphone,
  ArrowLeftRight,
} from 'lucide-react'

export function OverviewSection() {
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: recentActivity, isLoading: activityLoading } = useAdminActivity('7d')

  const kpis = [
    { title: 'Total Studios', value: stats?.studio_count ?? 0, icon: Building2, color: 'text-blue-400' },
    { title: 'Total Customers', value: stats?.customer_count ?? 0, icon: Users, color: 'text-emerald-400' },
    { title: 'Active Passes', value: stats?.active_pass_count ?? 0, icon: Wallet, color: 'text-violet-400' },
    { title: 'Transactions', value: stats?.transaction_count ?? 0, icon: TrendingUp, color: 'text-primary' },
    { title: 'Campaigns Sent', value: stats?.campaign_count ?? 0, icon: Megaphone, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.title} variant="glass-hover" className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 animate-shimmer rounded" />
              ) : (
                <p className="text-display-lg text-foreground">{kpi.value.toLocaleString()}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction Volume */}
      {stats && (
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Transaction Volume</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(stats.transaction_volume).toLocaleString()} kr
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Platform Activity */}
      <Card variant="glass" className="rounded-2xl">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-semibold text-foreground">Recent Platform Activity</h2>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
        <div className="px-5 pb-5">
          {activityLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : !recentActivity?.length ? (
            <div className="py-12 text-center">
              <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.slice(0, 15).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                      tx.type === 'credit' || tx.type === 'cashback'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'credit' || tx.type === 'cashback' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.customers?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{tx.description ?? tx.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {tx.studios?.name ?? 'Unknown'}
                    </Badge>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${
                        tx.type === 'credit' || tx.type === 'cashback' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tx.type === 'credit' || tx.type === 'cashback' ? '+' : '-'}
                        {Math.abs(Number(tx.amount)).toFixed(2)} kr
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

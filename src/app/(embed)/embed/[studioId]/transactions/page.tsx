'use client'

import { useStudio } from '@/hooks/use-studio'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const TYPE_COLORS: Record<string, string> = {
  credit: 'bg-emerald-500/10 text-emerald-400',
  debit: 'bg-red-500/10 text-red-400',
  cashback: 'bg-blue-500/10 text-blue-400',
  adjustment: 'bg-amber-500/10 text-amber-400',
  referral_commission: 'bg-violet-500/10 text-violet-400',
}

export default function EmbedTransactions() {
  const { currentStudio } = useStudio()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const studioId = currentStudio?.id

  const { data, isLoading } = useQuery({
    queryKey: ['embed-transactions', studioId],
    queryFn: async () => {
      const params = new URLSearchParams({ studioId: studioId!, token: token! })
      const res = await fetch(`/api/embed/transactions?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!studioId && !!token,
  })

  const transactions = data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Transactions</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t: Record<string, unknown>) => (
            <Card key={t.id as string} className="glass-card">
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {(t.customers as Record<string, unknown>)?.name as string ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(t.description as string) || t.type as string} &middot; {new Date(t.created_at as string).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={TYPE_COLORS[t.type as string] ?? 'bg-secondary text-secondary-foreground'}>
                    {t.type as string}
                  </Badge>
                  <span className={`text-sm font-semibold tabular-nums ${Number(t.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Number(t.amount) >= 0 ? '+' : ''}{Number(t.amount).toFixed(0)} kr
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

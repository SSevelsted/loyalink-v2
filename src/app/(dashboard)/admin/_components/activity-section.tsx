'use client'

import { useState } from 'react'
import { useAdminActivity } from '@/hooks/use-admin'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIME_RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
] as const

type TimeRange = (typeof TIME_RANGES)[number]['id']

export function ActivitySection() {
  const [range, setRange] = useState<TimeRange>('7d')
  const { data: transactions, isLoading } = useAdminActivity(range)

  return (
    <div className="space-y-4">
      {/* Time filter pills */}
      <div className="flex gap-1">
        {TIME_RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              range === r.id
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Transactions feed */}
      <Card variant="glass" className="rounded-2xl">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-semibold text-foreground">Cross-Studio Transactions</h2>
          <span className="text-xs text-muted-foreground">{transactions?.length ?? 0} transactions</span>
        </div>
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : !transactions?.length ? (
            <div className="py-12 text-center">
              <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions in this period</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
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
                      <p className="text-sm font-medium text-foreground">
                        {tx.customers?.name ?? 'Unknown'}
                      </p>
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
                        {new Date(tx.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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

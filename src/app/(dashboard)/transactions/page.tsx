'use client'

import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeftRight } from 'lucide-react'
import type { Transaction } from '@/types/database'

export default function TransactionsPage() {
  const { currentStudio } = useStudio()
  const supabase = createClient()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['all_transactions', currentStudio?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*, customers(name)')
        .eq('studio_id', currentStudio!.id)
        .order('created_at', { ascending: false })
        .limit(100)
      return data as (Transaction & { customers: { name: string } })[]
    },
    enabled: !!currentStudio,
  })

  const typeColors: Record<string, string> = {
    credit: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    debit: 'bg-red-500/10 text-red-400 border-red-500/20',
    adjustment: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cashback: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Transactions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {transactions?.length ?? 0} transactions
        </p>
      </div>

      <Card variant="glass" className="rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : !transactions?.length ? (
            <div className="py-20 text-center">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No transactions</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs text-muted-foreground uppercase tracking-wider">
                <span className="col-span-3">Date</span>
                <span className="col-span-3">Customer</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-2">Description</span>
                <span className="col-span-2 text-right">Amount</span>
              </div>
              {transactions.map((tx) => (
                <div key={tx.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-secondary/30 transition-colors min-h-[52px]">
                  <span className="col-span-3 text-sm text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('da-DK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="col-span-3 text-sm font-medium text-foreground truncate">
                    {tx.customers?.name ?? '-'}
                  </span>
                  <span className="col-span-2">
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${typeColors[tx.type] ?? ''}`}>
                      {tx.type}
                    </Badge>
                  </span>
                  <span className="col-span-2 text-sm text-muted-foreground truncate">
                    {tx.description ?? '-'}
                  </span>
                  <span className={`col-span-2 text-sm font-semibold text-right ${
                    tx.type === 'credit' || tx.type === 'cashback' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'credit' || tx.type === 'cashback' ? '+' : '-'}
                    {Math.abs(Number(tx.amount)).toFixed(2)} kr
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

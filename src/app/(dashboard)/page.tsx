'use client'

import { useStudio } from '@/hooks/use-studio'
import { useCustomers } from '@/hooks/use-customers'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, ArrowLeftRight, Wallet, TrendingUp, ScanLine, Link as LinkIcon, Copy, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { Transaction } from '@/types/database'
import { ScanDialog } from '@/components/scanner/scan-dialog'
import { useLandingPage } from '@/hooks/use-landing-page'
import { APP_URL } from '@/lib/constants'

function ScanButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98] cursor-pointer w-full glow-primary-sm"
      >
        <div className="relative h-12 w-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
          <ScanLine className="h-6 w-6 text-primary" />
          <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-primary">Scan Customer</p>
          <p className="text-xs text-muted-foreground">QR code or manual lookup</p>
        </div>
      </button>

      <ScanDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export default function DashboardPage() {
  const { currentStudio } = useStudio()
  const { data: customers } = useCustomers()
  const { data: landingPage } = useLandingPage()
  const [linkCopied, setLinkCopied] = useState(false)
  const supabase = createClient()

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent_transactions', currentStudio?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*, customers(name)')
        .eq('studio_id', currentStudio!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      return data as (Transaction & { customers: { name: string } })[]
    },
    enabled: !!currentStudio,
  })

  const { data: passCount } = useQuery({
    queryKey: ['pass_count', currentStudio?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('wallet_passes')
        .select('*', { count: 'exact', head: true })
        .eq('studio_id', currentStudio!.id)
        .eq('status', 'active')
      return count ?? 0
    },
    enabled: !!currentStudio,
  })

  const totalBalance = customers?.reduce((sum, c) => sum + Number(c.balance), 0) ?? 0

  const stats = [
    { title: 'Customers', value: customers?.length ?? 0, icon: Users, color: 'text-blue-400' },
    { title: 'Active Passes', value: passCount ?? 0, icon: Wallet, color: 'text-emerald-400' },
    { title: 'Total Balance', value: `${totalBalance.toFixed(0)} kr`, icon: TrendingUp, color: 'text-primary' },
    { title: 'Transactions', value: recentTransactions?.length ?? 0, icon: ArrowLeftRight, color: 'text-violet-400' },
  ]

  return (
    <div className="space-y-8 stagger-children">
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back to {currentStudio?.name}
        </p>
      </div>

      {/* Scan + Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <ScanButton />
        <div className="md:col-span-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} variant="glass-hover" className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-display-lg text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Share Signup Link */}
      {landingPage && (
        <Card variant="glass" className="rounded-2xl border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Your Signup Page</p>
                  <p className="text-xs text-muted-foreground">
                    {landingPage.view_count ?? 0} views &middot; {landingPage.signup_count ?? 0} signups
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  value={`${APP_URL}/join/${landingPage.slug}`}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${APP_URL}/join/${landingPage.slug}`)
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 2000)
                  }}
                >
                  {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {linkCopied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" asChild className="shrink-0 px-2">
                  <a href={`${APP_URL}/join/${landingPage.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card variant="glass" className="rounded-2xl">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
          <span className="text-xs text-muted-foreground">{recentTransactions?.length ?? 0} transactions</span>
        </div>
        <div className="px-5 pb-5">
          {!recentTransactions?.length ? (
            <div className="py-12 text-center">
              <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Transactions will appear here as they happen</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.map((tx) => (
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
                      <p className="text-sm font-medium text-foreground">{tx.customers?.name}</p>
                      <p className="text-xs text-muted-foreground">{tx.description ?? tx.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${
                      tx.type === 'credit' || tx.type === 'cashback' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'credit' || tx.type === 'cashback' ? '+' : '-'}
                      {Math.abs(Number(tx.amount)).toFixed(2)} kr
                    </span>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
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

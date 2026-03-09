import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Users, Wallet, TrendingUp, ArrowLeftRight, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-primary/8 blur-[160px]" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <div className="space-y-6">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary text-xs px-3 py-1">
            Built for tattoo studios
          </Badge>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Stop Running Cheap Deals.{' '}
            <span className="text-primary">Build Real Loyalty.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Give clients a reason to come back that isn&apos;t a discount or the aftercare cream you got for free. Cashback they can only spend with you — in their phone, no app needed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="gap-2 text-base h-12 px-6 rounded-xl" asChild>
              <Link href="/signup">
                Start your 14-day free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base h-12 px-6 rounded-xl" asChild>
              <a href="#how-it-works">See how it works ↓</a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            14 days free · Cancel anytime · 5 minutes to set up
          </p>
        </div>

        {/* Right: dashboard mockup */}
        <div className="relative lg:block">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur p-5 space-y-4 shadow-2xl shadow-black/40">
            {/* Header bar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Welcome back</p>
                <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Black Anchor Studio</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: 'Customers', value: '847', color: 'text-blue-400' },
                { icon: Wallet, label: 'Active Passes', value: '612', color: 'text-emerald-400' },
                { icon: TrendingUp, label: 'Total Balance', value: '€4,230', color: 'text-primary' },
                { icon: ArrowLeftRight, label: 'Transactions', value: '1,294', color: 'text-violet-400' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-secondary/30 border border-border/30 p-3">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color} mb-2`} />
                  <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</p>
              {[
                { name: 'Sarah K.', amount: '+€45.00', cashback: '+€2.25', color: 'text-emerald-400' },
                { name: 'Marcus T.', amount: '+€120.00', cashback: '+€6.00', color: 'text-emerald-400' },
                { name: 'Emma R.', amount: '−€15.00 balance', cashback: '', color: 'text-red-400' },
              ].map((tx) => (
                <div key={tx.name} className="flex items-center justify-between rounded-lg px-2.5 py-2 bg-secondary/20">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-medium text-foreground">
                      {tx.name.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-foreground">{tx.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${tx.color}`}>{tx.amount}</span>
                    {tx.cashback && (
                      <p className="flex items-center gap-0.5 justify-end text-[10px] text-amber-400">
                        <Sparkles className="h-2.5 w-2.5" />
                        {tx.cashback}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-4 -left-4 rounded-xl border border-primary/20 bg-background/90 backdrop-blur px-3 py-2 shadow-lg">
            <p className="text-[11px] text-muted-foreground">Monthly repeat visits</p>
            <p className="text-lg font-bold text-primary" style={{ fontFamily: 'var(--font-display)' }}>+34%</p>
          </div>
        </div>
      </div>
    </section>
  )
}

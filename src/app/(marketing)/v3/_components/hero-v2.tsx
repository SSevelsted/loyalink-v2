import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Users, Wallet, TrendingUp, ArrowLeftRight, Sparkles, CalendarCheck } from 'lucide-react'
import { PLATFORM_URL } from '@/lib/constants'

export function HeroV2() {
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
            Stop Starting from Zero{' '}
            <span className="text-primary">Every Month.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            You don&apos;t need to constantly hustle for new clients. Turn your current clients into regulars who come back — and bring their friends. No discounts. Just a simple cashback wallet right on their phone.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="gap-2 text-base h-12 px-6 rounded-xl" asChild>
              <a href={`${PLATFORM_URL}/signup`}>
                Start your 14-day free trial
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base h-12 px-6 rounded-xl" asChild>
              <a href="#how-it-works">See how it works &#8595;</a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            14 days free &middot; Cancel anytime &middot; 5 minutes to set up
          </p>
        </div>

        {/* Right: calendar visualization */}
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
                { icon: Users, label: 'Returning clients', value: '312', color: 'text-blue-400' },
                { icon: CalendarCheck, label: 'Pre-booked next month', value: '47%', color: 'text-emerald-400' },
                { icon: TrendingUp, label: 'Avg. return rate', value: '38%', color: 'text-primary' },
                { icon: Wallet, label: 'Outstanding balance', value: '€4,230', color: 'text-violet-400' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-secondary/30 border border-border/30 p-3">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color} mb-2`} />
                  <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Returning clients */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clients Coming Back</p>
              {[
                { name: 'Sarah K.', visits: '4th visit', days: 'Booked in 12 days', color: 'text-emerald-400' },
                { name: 'Marcus T.', visits: '2nd visit', days: 'Referred by Emma R.', color: 'text-blue-400' },
                { name: 'Lina W.', visits: '6th visit', days: 'VIP tier — 8% cashback', color: 'text-amber-400' },
              ].map((client) => (
                <div key={client.name} className="flex items-center justify-between rounded-lg px-2.5 py-2 bg-secondary/20">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-medium text-foreground">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">{client.name}</span>
                      <p className="text-[10px] text-muted-foreground">{client.visits}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium ${client.color}`}>{client.days}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-4 -left-4 rounded-xl border border-primary/20 bg-background/90 backdrop-blur px-3 py-2 shadow-lg">
            <p className="text-[11px] text-muted-foreground">Calendar fill rate</p>
            <p className="text-lg font-bold text-primary" style={{ fontFamily: 'var(--font-display)' }}>47% pre-booked</p>
          </div>
        </div>
      </div>
    </section>
  )
}

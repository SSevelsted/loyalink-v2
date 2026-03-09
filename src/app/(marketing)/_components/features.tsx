import { Wallet, TrendingUp, Users, Bell, BarChart3, Sparkles } from 'lucide-react'

const features = [
  {
    icon: Wallet,
    title: 'Apple & Google Wallet',
    body: 'Passes live in customers\' phones the moment they sign up. No app download, no friction — just tap and go.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Cashback Tiers',
    body: 'Silver, Gold, VIP — bigger spenders automatically earn higher cashback rates. Reward the customers that matter most.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  {
    icon: Users,
    title: 'Referral Engine',
    body: 'Every time a client shows off fresh ink, someone asks "where did you get that?" With Loyalink they have a real reason to share — they earn cashback for every friend they bring in. Your clients become your best acquisition channel.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    body: 'Re-engage customers who haven\'t visited in a while. Send targeted wallet notifications directly to their lock screen.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    body: 'See exactly who\'s loyal, who\'s slipping, and which promotions are working. Data you can act on, in real time.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Sparkles,
    title: 'AI Story Generator',
    body: 'Auto-generate Instagram and TikTok content to promote your loyalty program. Stay top of mind without the effort.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-muted/10">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Everything in one place.<br />No tech skills needed.
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Set it up in an afternoon. Then just tattoo — it runs itself.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/40 bg-card/50 p-6 space-y-3 hover:border-border/80 transition-colors"
            >
              <div className={`h-10 w-10 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

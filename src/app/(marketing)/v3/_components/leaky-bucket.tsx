import { Droplets, Search, BarChart3, UserCheck } from 'lucide-react'

const points = [
  {
    icon: Search,
    title: 'See who\'s slipping away',
    body: 'Know exactly which clients haven\'t been back in 3, 6, or 12 months. No guessing, no checking Instagram DMs — real data.',
  },
  {
    icon: UserCheck,
    title: 'Re-engage before they forget you',
    body: 'Send a wallet notification directly to their lock screen. Not a generic newsletter they\'ll ignore — a personal reminder with their cashback balance waiting.',
  },
  {
    icon: BarChart3,
    title: 'Measure what actually matters',
    body: 'Return rate. Average visits per client. Referral conversions. The numbers that tell you if your business is compounding or just treading water.',
  },
]

export function LeakyBucket() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-xs text-blue-400">
            <Droplets className="h-3.5 w-3.5" />
            The leaky bucket
          </div>
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Stop pouring water<br />into a leaky bucket.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Most studios think their problem is &ldquo;I need more clients.&rdquo; So they run ads, post reels every day, and hustle. But if 100 people message you and only 10 book — and of those 10, only 1 ever comes back — you don&apos;t have a lead problem. You have a leak.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {points.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-border/40 bg-card/50 p-6 space-y-3 hover:border-border/80 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <point.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{point.body}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 text-center space-y-3">
          <p className="text-foreground font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Fix the holes before you hustle for more leads.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Loyalink shows you exactly who is coming back and who is slipping away. It helps you plug the holes so that the hard work you put into getting a client actually pays off for years, not just for one session.
          </p>
        </div>
      </div>
    </section>
  )
}

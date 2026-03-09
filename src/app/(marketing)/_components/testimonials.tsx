import { Star } from 'lucide-react'

const testimonials = [
  {
    quote: "We were doing Groupon every month just to fill the calendar. Since switching to Loyalink, our regulars spend 40% more and I haven't run a discount in four months. I wish I'd done this years ago.",
    name: 'Maria Jensen',
    role: 'Owner, Black Anchor Tattoo Studio',
    initials: 'MJ',
  },
  {
    quote: "The wallet pass thing is genuinely magic. Customers just tap and it's in their Apple Wallet. No app, no faff. We had 60 members in the first week without doing anything special.",
    name: 'Tom Eriksen',
    role: 'Founder, Inkline Copenhagen',
    initials: 'TE',
  },
  {
    quote: "I can see exactly who comes in regularly and who's drifting away. The analytics paid for itself the first time I sent a re-engagement push and three customers booked the same day.",
    name: 'Sophie Andersen',
    role: 'Manager, Studio Noir',
    initials: 'SA',
  },
]

function Stars() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

export function Testimonials() {
  return (
    <section className="py-20 px-4 bg-muted/10">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Studios that escaped<br />the rat race
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border/40 bg-card/50 p-6 space-y-4 flex flex-col">
              <Stars />
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { Star } from 'lucide-react'

const testimonials = [
  {
    quote: "I used to dread the first week of every month — the calendar was always empty and I'd start panicking. Since setting up Loyalink, half my spots are already filled by regulars before the month even starts. I can actually plan ahead now.",
    name: 'Maria Jensen',
    role: 'Owner, Black Anchor Tattoo Studio',
    initials: 'MJ',
  },
  {
    quote: "We thought our clients came back because the work was good. Turns out only about 8% did. Once we gave them a real reason — cashback in their wallet — that number tripled in three months. No discounts, no gimmicks.",
    name: 'Tom Eriksen',
    role: 'Founder, Inkline Copenhagen',
    initials: 'TE',
  },
  {
    quote: "The referral system changed everything. We used to spend hours trying to convince strangers on Instagram. Now our best clients do the selling for us. Last month, 40% of our new bookings came through referrals.",
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

export function TestimonialsV2() {
  return (
    <section className="py-20 px-4 bg-muted/10">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Studios that got off<br />the hamster wheel
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

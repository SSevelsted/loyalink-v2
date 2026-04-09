import { AlertTriangle, RotateCcw, Clock, Instagram } from 'lucide-react'

const traps = [
  {
    icon: RotateCcw,
    title: 'The hamster wheel',
    body: 'No matter how fully booked you are this month, next month you start the hustle all over again. New posts, new DMs, new leads who don\'t know your work. You\'re spinning the wheel from zero — every single month.',
  },
  {
    icon: Clock,
    title: 'Hours of content, zero loyalty',
    body: 'You spend hours on reels, stories, and posts. Maybe you get some bookings. But those people came for a trending style or a cheap rate — not for you. Next time they need ink, they\'ll search again and probably pick someone else.',
  },
  {
    icon: Instagram,
    title: 'Convincing strangers is exhausting',
    body: 'Every new lead from social media needs to be sold. They don\'t know your prices, your style, or your process. You\'re doing the hard work of building trust from scratch — over and over, with every single person.',
  },
]

export function PainV2() {
  return (
    <section className="py-20 px-4 bg-red-950/10">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            The real problem
          </div>
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            You&apos;re Fully Booked Today.<br />But What About Next Month?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The hardest part of running a studio isn&apos;t doing the work — it&apos;s making sure there&apos;s always more work coming. Most artists are stuck in an endless cycle of chasing new clients.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {traps.map((trap) => (
            <div
              key={trap.title}
              className="rounded-2xl border border-red-500/10 bg-red-500/5 p-6 space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <trap.icon className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-foreground">{trap.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{trap.body}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground italic border-t border-border/30 pt-8">
          &ldquo;The anxiety of never knowing if next month will be full — that&apos;s the real tax of running a studio.&rdquo;
        </p>
      </div>
    </section>
  )
}

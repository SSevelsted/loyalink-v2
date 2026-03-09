import { AlertTriangle, Tag, Ticket, Megaphone } from 'lucide-react'

const traps = [
  {
    icon: Tag,
    title: 'Run big discounts',
    body: 'Your feed fills up with "what\'s your cheapest rate?" — from people comparing three studios at once. They\'ll go with whoever quotes lowest. You trained them to shop on price, and now that\'s all you attract.',
  },
  {
    icon: Ticket,
    title: 'Sell cheap vouchers',
    body: 'You sold €300 of work for €150 to fill the calendar. Now that client tells everyone they got tattooed for half price. You didn\'t build loyalty — you just set a new price expectation.',
  },
  {
    icon: Megaphone,
    title: 'Post every day and hustle',
    body: 'Hours of content, reels, stories — and the DMs you get are still "how much for something small?" People who value your craft aren\'t the ones asking five studios for a quote.',
  },
]

export function Pain() {
  return (
    <section className="py-20 px-4 bg-red-950/10">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            The problem
          </div>
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            You&apos;ve Tried Everything.<br />None of It Sticks.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every tactic that&apos;s supposed to bring clients back ends up attracting the wrong ones — or devaluing the work you put your name on.
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
          &ldquo;The clients you win with discounts are the same ones who&apos;ll leave the moment someone else is cheaper.&rdquo;
        </p>
      </div>
    </section>
  )
}

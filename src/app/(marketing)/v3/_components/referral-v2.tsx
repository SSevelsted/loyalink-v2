import { X, Check } from 'lucide-react'

const contrast = [
  {
    label: 'The hard work',
    bad: true,
    subtitle: 'Convincing a stranger from Instagram',
    traits: [
      'They don\'t know you — found you from a hashtag or ad',
      'First message: "how much for something small?"',
      'Comparing your prices with three other studios',
      'You have to sell yourself, your style, and your rates',
      'Even if they book, they probably won\'t come back',
    ],
  },
  {
    label: 'The easy work',
    bad: false,
    subtitle: 'A friend sent by your existing client',
    traits: [
      'They\'ve been staring at your work on their buddy\'s arm for weeks',
      'Already trust you before they even message',
      'Not shopping around — they want you specifically',
      'Know what it costs because their friend told them',
      'Come back. And send the next one.',
    ],
  },
]

export function ReferralV2() {
  return (
    <section className="py-20 px-4 bg-primary/[0.03]">
      <div className="max-w-5xl mx-auto space-y-14">

        <div className="text-center space-y-4">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Let your regulars do<br />the selling for you.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Think about the hardest lead you get: someone from an Instagram ad. They don&apos;t know you, they&apos;re comparing prices, and they want a sleeve for &euro;500. That&apos;s the hard work.
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Now think about the easiest lead: a client&apos;s friend. They&apos;ve been admiring your work for weeks. They already trust you. They just want you. With Loyalink, your clients earn cashback every time a friend books through them — so they don&apos;t just mention you, they actively send people your way.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {contrast.map((side) => (
            <div
              key={side.label}
              className={`rounded-2xl border p-7 space-y-5 ${
                side.bad
                  ? 'border-red-500/15 bg-red-500/5'
                  : 'border-primary/25 bg-primary/5'
              }`}
            >
              <div>
                <p className={`text-sm font-semibold uppercase tracking-wider ${side.bad ? 'text-red-400' : 'text-primary'}`}>
                  {side.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{side.subtitle}</p>
              </div>
              <ul className="space-y-3">
                {side.traits.map((trait) => (
                  <li key={trait} className="flex items-start gap-3 text-sm">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                      side.bad
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-emerald-500/10 border border-emerald-500/20'
                    }`}>
                      {side.bad
                        ? <X className="h-3 w-3 text-red-400" />
                        : <Check className="h-3 w-3 text-emerald-400" />
                      }
                    </div>
                    <span className="text-muted-foreground leading-snug">{trait}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground italic border-t border-border/30 pt-8">
          &ldquo;Stop doing the hard work of convincing strangers. Let your regulars do the easy work for you.&rdquo;
        </p>

      </div>
    </section>
  )
}

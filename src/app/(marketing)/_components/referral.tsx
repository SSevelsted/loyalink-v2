import { X, Check } from 'lucide-react'

const contrast = [
  {
    label: 'Discount client',
    bad: true,
    traits: [
      'Found you on a flash sale post',
      'First message: "how much for this?"',
      'Comparing you to four other studios',
      'Expects a sleeve for €500',
      'Never comes back at full price',
    ],
  },
  {
    label: 'Referral client',
    bad: false,
    traits: [
      'Sent by a friend whose tattoo they\'ve been staring at for weeks',
      'Already trusts your work before they message',
      'Not shopping around — they want you specifically',
      'Knows what things cost because their friend told them',
      'Comes back. And sends the next one.',
    ],
  },
]

export function Referral() {
  return (
    <section className="py-20 px-4 bg-primary/[0.03]">
      <div className="max-w-5xl mx-auto space-y-14">

        <div className="text-center space-y-4">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Imagine 50 people out there<br />promoting your studio right now.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            You know this better than anyone. A fresh tattoo still wrapped in cling film turns heads. People ask. That moment is the best sales pitch your studio will ever have — and it&apos;s walking around on someone else&apos;s arm for free.
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            With Loyalink&apos;s referral program, your clients earn cashback every time a friend books through them. Now they don&apos;t just mention you — they actively send people your way. Not because they&apos;re nice. Because they get something out of it too.
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
              <p className={`text-sm font-semibold uppercase tracking-wider ${side.bad ? 'text-red-400' : 'text-primary'}`}>
                {side.label}
              </p>
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
          &ldquo;The best client you&apos;ll ever get walked in because their friend wouldn&apos;t shut up about you.&rdquo;
        </p>

      </div>
    </section>
  )
}

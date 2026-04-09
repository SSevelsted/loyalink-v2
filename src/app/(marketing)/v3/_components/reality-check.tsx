import { MessageCircleQuestion, TrendingUp, ArrowRight } from 'lucide-react'

export function RealityCheck() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-8 md:p-12 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-400">
              <MessageCircleQuestion className="h-3.5 w-3.5" />
              The objection we hear most
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              &ldquo;But my clients already come back.&rdquo;
            </h2>
          </div>

          {/* Body */}
          <div className="space-y-5 max-w-2xl">
            <p className="text-muted-foreground leading-relaxed">
              We&apos;ve spoken to hundreds of studio owners and artists. Almost all of them say this. And it&apos;s true — if you do good work, a natural percentage of people will return.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              But usually, that&apos;s <span className="text-foreground font-semibold">less than 10% of your clients</span>. The other 90%? They loved the work. They had a great experience. They just... didn&apos;t think of you when they wanted their next piece six months later.
            </p>
            <p className="text-muted-foreground leading-relaxed italic">
              Leaving your return rate to chance is leaving thousands of euros on the table. And no, giving them a free aftercare cream doesn&apos;t count as a system.
            </p>
          </div>

          {/* The vision */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="font-semibold text-foreground">What if you actually systematized it?</p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Imagine turning that 10% natural return rate into 30% or 50%. That&apos;s when you stop rushing to fill spots every month. That&apos;s when your calendar starts filling itself — not from strangers on Instagram, but from people who already know your work and trust your craft.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { stat: '~10%', label: 'Natural return rate', sub: 'without a system' },
              { stat: '→', label: '', sub: '' },
              { stat: '30–50%', label: 'With Loyalink', sub: 'systematized retention' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                {i === 1 ? (
                  <div className="flex items-center justify-center h-full">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                ) : (
                  <>
                    <p
                      className={`text-2xl sm:text-3xl font-bold ${i === 0 ? 'text-muted-foreground' : 'text-primary'}`}
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {item.stat}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

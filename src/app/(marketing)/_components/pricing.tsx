import { Check, Zap, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PLATFORM_URL } from '@/lib/constants'

const plans = [
  {
    key: 'basic',
    name: 'Basic',
    price: '€49',
    description: 'Perfect for independent studios',
    features: [
      '1 location',
      'Apple & Google Wallet passes',
      'Cashback loyalty program',
      'Referral program',
      'Basic analytics',
      'Email support',
    ],
    popular: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '€79',
    description: 'For growing studios with a team',
    features: [
      'Up to 5 locations',
      'Everything in Basic',
      'Multi-tier loyalty (Silver/Gold/VIP)',
      'Automated push notifications',
      'Audience segmentation',
      'AI Story Generator',
      '5 team logins',
      'Priority support',
    ],
    popular: true,
  },
]

const memberRates = [
  { label: 'First 100 members', rate: '€0.79 each' },
  { label: '101 – 500', rate: '€0.59 each' },
  { label: '501 – 2,000', rate: '€0.39 each' },
  { label: '2,000+', rate: '€0.29 each' },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Simple pricing.<br />Powerful loyalty.
          </h2>
          <p className="text-muted-foreground">Start free for 14 days. Cancel before day 15 and you pay nothing.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-7 space-y-5 ${
                plan.popular
                  ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border/40 bg-card/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1 rounded-full px-3 text-xs">
                    <Zap className="h-3 w-3" />
                    Most popular
                  </Badge>
                </div>
              )}

              <div>
                <p className="font-semibold text-foreground">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">/mo + usage</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    </div>
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? 'default' : 'outline'}
                className="w-full"
                asChild
              >
                <a href={`${PLATFORM_URL}/signup?plan=${plan.key}`}>Start free trial</a>
              </Button>
            </div>
          ))}
        </div>

        {/* Usage pricing table */}
        <details className="max-w-2xl mx-auto group">
          <summary className="flex items-center justify-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors list-none">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            View per-member usage pricing
          </summary>
          <div className="mt-4 rounded-xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/30 border-b border-border/40">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Active members</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Monthly rate</th>
                </tr>
              </thead>
              <tbody>
                {memberRates.map((r, i) => (
                  <tr key={r.label} className={i < memberRates.length - 1 ? 'border-b border-border/20' : ''}>
                    <td className="px-4 py-3 text-foreground">{r.label}</td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            An active member is any client who earned or redeemed cashback in that calendar month.
          </p>
        </details>
      </div>
    </section>
  )
}

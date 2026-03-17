import { Settings, Smartphone, TrendingUp } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Settings,
    title: 'Set up your program',
    body: 'Configure cashback rates, loyalty tiers, and your branded signup page in minutes. No dev work needed.',
  },
  {
    number: '02',
    icon: Smartphone,
    title: 'Clients join in 30 seconds',
    body: 'No app download required. Clients scan your QR code and your loyalty pass lands straight in Apple or Google Wallet.',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'They keep coming back',
    body: 'Every purchase automatically earns cashback they can only spend with you. Their wallet balance is their reason to return.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Loyalty in 3 Steps
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            From zero to a fully running loyalty program before your next client walks in.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {steps.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center space-y-4">
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <step.icon className="h-8 w-8 text-primary" />
                <span
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {step.number.replace('0', '')}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

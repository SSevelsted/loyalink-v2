import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLATFORM_URL } from '@/lib/constants'

export function FinalCtaV2() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto text-center space-y-6">
        <h2
          className="text-4xl sm:text-5xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Ready to get off the hamster wheel?
        </h2>
        <p className="text-muted-foreground text-lg">
          Stop starting from zero every month. Join 200+ studios that turned one-time clients into regulars — without a single discount.
        </p>
        <Button size="lg" className="gap-2 text-base h-12 px-8 rounded-xl" asChild>
          <a href={`${PLATFORM_URL}/signup`}>
            Start your 14-day free trial
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          14 days free &middot; 5-minute setup &middot; Cancel anytime
        </p>
      </div>
    </section>
  )
}

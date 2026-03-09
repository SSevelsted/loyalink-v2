import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FinalCta() {
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
          Ready to stop discounting and start building loyalty?
        </h2>
        <p className="text-muted-foreground text-lg">
          Join 200+ studios that replaced vouchers with a program that actually pays off.
        </p>
        <Button size="lg" className="gap-2 text-base h-12 px-8 rounded-xl" asChild>
          <Link href="/signup">
            Start your 14-day free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          14 days free · 5-minute setup · Cancel anytime
        </p>
      </div>
    </section>
  )
}

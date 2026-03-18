import type { Metadata } from 'next'
import { LogoMark } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { PLATFORM_URL } from '@/lib/constants'
import { MarketingNav } from '../_components/nav'
import { Footer } from '../_components/footer'

export const metadata: Metadata = {
  title: 'About — Loyalink',
  description: 'Loyalink is a loyalty platform built specifically for tattoo studios. Learn why we exist and who we built it for.',
}

export default function AboutPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto space-y-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <LogoMark className="h-full w-full text-primary p-1.5" />
              </div>
              <h1
                className="text-4xl sm:text-5xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                About Loyalink
              </h1>
            </div>
          </div>

          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <p>
              Loyalink is a loyalty platform built for tattoo studios. We help studio owners bring clients back
              without resorting to discounts, deal sites, or aggressive marketing.
            </p>
            <p>
              The idea started from a simple observation: tattoo studios do incredible work, but most have no
              system for turning a one-time client into a regular. Generic loyalty apps don&apos;t fit the
              industry, and building something custom is expensive.
            </p>
            <p>
              So we built Loyalink — cashback loyalty programs, Apple &amp; Google Wallet passes, referral
              tools, and push notifications, all designed around how tattoo studios actually operate.
            </p>
            <p>
              We&apos;re a small, independent team based in Copenhagen. We care about building something
              genuinely useful, not adding features for the sake of it.
            </p>
          </div>

          <div className="pt-4">
            <Button asChild>
              <a href={`${PLATFORM_URL}/signup`}>Start your free trial</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

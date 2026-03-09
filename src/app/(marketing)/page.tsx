import { MarketingNav } from './_components/nav'
import { Hero } from './_components/hero'
import { TrustBar } from './_components/trust-bar'
import { Pain } from './_components/pain'
import { HowItWorks } from './_components/how-it-works'
import { Features } from './_components/features'
import { Referral } from './_components/referral'
import { Comparison } from './_components/comparison'
import { Testimonials } from './_components/testimonials'
import { Pricing } from './_components/pricing'
import { Faq } from './_components/faq'
import { FinalCta } from './_components/final-cta'
import { Footer } from './_components/footer'

export default function HomePage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <TrustBar />
        <Pain />
        <HowItWorks />
        <Features />
        <Referral />
        <Comparison />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}

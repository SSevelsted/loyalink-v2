import { MarketingNav } from '../_components/nav'
import { HeroV2 } from './_components/hero-v2'
import { TrustBar } from '../_components/trust-bar'
import { RealityCheck } from './_components/reality-check'
import { PainV2 } from './_components/pain-v2'
import { HowItWorks } from '../_components/how-it-works'
import { Features } from '../_components/features'
import { ReferralV2 } from './_components/referral-v2'
import { LeakyBucket } from './_components/leaky-bucket'
import { Comparison } from '../_components/comparison'
import { TestimonialsV2 } from './_components/testimonials-v2'
import { Pricing } from '../_components/pricing'
import { Faq } from '../_components/faq'
import { FinalCtaV2 } from './_components/final-cta-v2'
import { Footer } from '../_components/footer'

export default function HomePageV2() {
  return (
    <>
      <MarketingNav />
      <main>
        <HeroV2 />
        <TrustBar />
        <RealityCheck />
        <PainV2 />
        <HowItWorks />
        <Features />
        <ReferralV2 />
        <LeakyBucket />
        <Comparison />
        <TestimonialsV2 />
        <Pricing />
        <Faq />
        <FinalCtaV2 />
      </main>
      <Footer />
    </>
  )
}

import type { Metadata } from 'next'
import { MarketingNav } from '../_components/nav'
import { Footer } from '../_components/footer'

export const metadata: Metadata = {
  title: 'Terms of Service — Loyalink',
  description: 'Terms and conditions for using the Loyalink platform.',
}

export default function TermsPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: March 2026</p>

          <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">1. Agreement</h2>
              <p>
                By creating a Loyalink account, you agree to these terms. Loyalink is operated by
                Loyalink ApS, Copenhagen, Denmark. If you do not agree with these terms, do not use
                the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">2. Free trial</h2>
              <p>
                All new accounts start with a 14-day free trial with full access to your chosen plan.
                We collect your payment details at signup. If you do not cancel before the trial ends,
                your subscription begins automatically on day 15 and your card is charged.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">3. Billing and payments</h2>
              <p>
                Subscriptions are billed monthly via Stripe. Your invoice includes the base plan fee
                plus per-member usage charges based on active members that month. All prices are in
                EUR and exclude VAT where applicable.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">4. Cancellation</h2>
              <p>
                You can cancel your subscription at any time from your account settings. After
                cancellation, your account remains active until the end of the current billing period.
                No refunds are provided for partial months.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">5. Your data</h2>
              <p>
                You own the data you put into Loyalink — your studio information, client records, and
                transaction history. You can export your data at any time. If you delete your account,
                we remove your data within 30 days unless legally required to retain it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">6. Acceptable use</h2>
              <p>
                You agree not to misuse the platform, including but not limited to: creating
                fraudulent transactions, abusing the referral system, or using the service for
                unlawful purposes. We reserve the right to suspend accounts that violate these terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">7. Service availability</h2>
              <p>
                We aim to keep Loyalink available at all times but do not guarantee 100% uptime. We
                are not liable for losses caused by service interruptions, though we will always
                communicate outages transparently.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">8. Liability</h2>
              <p>
                Loyalink is provided &ldquo;as is&rdquo;. Our total liability is limited to the
                amount you have paid us in the 12 months preceding a claim. We are not responsible for
                indirect or consequential damages.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">9. Changes to terms</h2>
              <p>
                We may update these terms from time to time. We will notify you by email at least 14
                days before any material changes take effect. Continued use of the service after
                changes constitutes acceptance.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
              <p>
                Questions about these terms? Email us at{' '}
                <a href="mailto:hello@loyalink.com" className="text-primary hover:underline">
                  hello@loyalink.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

import type { Metadata } from 'next'
import { MarketingNav } from '../_components/nav'
import { Footer } from '../_components/footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — Loyalink',
  description: 'How Loyalink collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: March 2026</p>

          <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">1. Who we are</h2>
              <p>
                Loyalink is operated by Loyalink ApS, Copenhagen, Denmark. We provide a loyalty
                platform for tattoo studios, including cashback programs, wallet passes, and referral
                tools.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">2. Data we collect</h2>
              <p>We collect the following data depending on your role:</p>
              <p className="font-medium text-foreground">Studio owners (our customers):</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name, email address, and phone number</li>
                <li>Studio name, address, and logo</li>
                <li>Payment information (processed securely by Stripe — we never store card numbers)</li>
                <li>Usage data and analytics</li>
              </ul>
              <p className="font-medium text-foreground">End clients (loyalty program members):</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name, email address, and phone number</li>
                <li>Transaction history and cashback balance</li>
                <li>Wallet pass data (Apple Wallet / Google Wallet)</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">3. How we use your data</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To provide and operate the Loyalink platform</li>
                <li>To process payments via Stripe</li>
                <li>To send transactional emails (receipts, trial reminders, account notifications)</li>
                <li>To generate and deliver Apple and Google Wallet passes</li>
                <li>To provide analytics and insights to studio owners</li>
              </ul>
              <p>We do not sell your data to third parties. We do not run ads.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">4. Hosting and infrastructure</h2>
              <p>
                Our application is hosted on Vercel (frontend) and Supabase (database and
                authentication), both of which process data in the EU. Payment processing is handled
                by Stripe.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
              <p>
                We use essential cookies for authentication and session management. We use Vercel
                Analytics for anonymous usage statistics. We do not use advertising or tracking
                cookies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">6. Your rights (GDPR)</h2>
              <p>If you are in the EU/EEA, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Request correction or deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Withdraw consent at any time</li>
                <li>Lodge a complaint with your local data protection authority</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">7. Data retention</h2>
              <p>
                We retain your data for as long as your account is active. If you delete your account,
                we remove your personal data within 30 days. Some data may be retained longer where
                required by law (e.g. invoices for tax purposes).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
              <p>
                For any privacy-related questions, email us at{' '}
                <a href="mailto:privacy@loyalink.com" className="text-primary hover:underline">
                  privacy@loyalink.com
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

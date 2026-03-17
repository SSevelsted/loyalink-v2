import type { Metadata } from 'next'
import { MarketingNav } from '../_components/nav'
import { Footer } from '../_components/footer'

export const metadata: Metadata = {
  title: 'Blog — Loyalink',
  description: 'Insights on loyalty, retention, and growing your tattoo studio. Coming soon.',
}

export default function BlogPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Blog
          </h1>
          <p className="text-muted-foreground">
            We&apos;re working on articles about loyalty, retention, and growing your tattoo studio.
            Check back soon.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}

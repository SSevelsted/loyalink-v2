import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Loyalink — Loyalty for Tattoo Studios',
  description: 'Give clients a reason to come back that isn\'t a discount. Cashback loyalty, wallet passes, and referrals — built for tattoo studios.',
  openGraph: {
    title: 'Loyalink — Loyalty for Tattoo Studios',
    description: 'Give clients a reason to come back that isn\'t a discount.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loyalink — Loyalty for Tattoo Studios',
    description: 'Cashback loyalty, wallet passes, and referrals — built for tattoo studios.',
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}

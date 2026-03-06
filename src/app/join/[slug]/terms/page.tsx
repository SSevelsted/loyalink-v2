import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { migrateRewardsConfig } from '@/types/database'

type Props = { params: Promise<{ slug: string }> }

const SUPERVISORY_AUTHORITY: Record<string, string> = {
  DK: 'Datatilsynet (datatilsynet.dk)',
  SE: 'Integritetsskyddsmyndigheten (imy.se)',
  NO: 'Datatilsynet (datatilsynet.no)',
  DE: 'Bundesbeauftragte für den Datenschutz (bfdi.bund.de)',
  FR: 'CNIL (cnil.fr)',
  GB: 'ICO (ico.org.uk)',
  NL: 'Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl)',
  PL: 'UODO (uodo.gov.pl)',
  ES: 'AEPD (aepd.es)',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('studio_landing_pages')
    .select('studios(name)')
    .eq('slug', slug)
    .single()
  const name = (data?.studios as { name?: string } | null)?.name ?? 'Studio'
  return { title: `Terms & Privacy — ${name}` }
}

function Section({
  title,
  children,
  brandColor,
  txtColor,
}: {
  title: string
  children: React.ReactNode
  brandColor: string
  txtColor: string
}) {
  return (
    <section>
      <h2
        style={{
          color: brandColor,
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          color: txtColor,
          fontSize: '0.9rem',
          lineHeight: '1.75',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
        }}
      >
        {children}
      </div>
    </section>
  )
}

export default async function TermsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('*, studios(id, name, settings)')
    .eq('slug', slug)
    .single()

  if (!page) notFound()

  const studio = page.studios as { id: string; name: string; settings: Record<string, unknown> } | null
  const studioSettings = (studio?.settings ?? {}) as Record<string, unknown>
  const rewardsConfig = migrateRewardsConfig(studioSettings.rewards_config)
  const landingSettings = (page.settings ?? {}) as {
    brandColor?: string
    backgroundColor?: string
    textColor?: string
  }

  const brandColor = landingSettings.brandColor || '#7C3AED'
  const bgColor = landingSettings.backgroundColor || '#0A0A0A'
  const txtColor = landingSettings.textColor || '#FFFFFF'
  const mutedColor = `${txtColor}80`

  const studioName = studio?.name ?? 'The Studio'
  const email = (studioSettings.business_email as string) || ''
  const phone = (studioSettings.business_phone as string) || ''
  const addressParts = [
    studioSettings.address_street as string,
    studioSettings.address_postal_code as string,
    studioSettings.address_city as string,
    studioSettings.address_country as string,
  ].filter(Boolean)
  const address = addressParts.join(', ')
  const country = (studioSettings.address_country as string) || 'DK'
  const authority = SUPERVISORY_AUTHORITY[country] ?? 'your national data protection authority'
  const year = new Date().getFullYear()

  const baseTier = rewardsConfig.tiers[0]
  const maxTier = rewardsConfig.tiers[rewardsConfig.tiers.length - 1]
  const hasMultipleTiers = rewardsConfig.tiers.length > 1
  const referrals = rewardsConfig.referrals

  const divider = (
    <hr style={{ border: 'none', borderTop: `1px solid ${txtColor}15`, margin: '0' }} />
  )

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh' }}>
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '48px 24px 96px' }}>

        <Link
          href={`/join/${slug}`}
          style={{
            color: brandColor,
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            marginBottom: '2.5rem',
            textDecoration: 'none',
            opacity: 0.85,
          }}
        >
          ← Back to signup
        </Link>

        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ color: txtColor, fontSize: '1.875rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            Terms &amp; Privacy
          </h1>
          <p style={{ color: mutedColor, fontSize: '0.875rem' }}>
            {studioName} &mdash; Last updated {year}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── TERMS OF SERVICE ── */}
          <p style={{ color: brandColor, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Terms of Service
          </p>

          <Section title="Loyalty Programme" brandColor={brandColor} txtColor={txtColor}>
            <p>{studioName} operates a digital cashback loyalty programme. By signing up you accept these terms, which form a binding agreement between you and {studioName}.</p>
            <p>Membership is free and open to individuals aged 16 or older. One account per person. You are responsible for keeping your contact details up to date.</p>
          </Section>

          {divider}

          <Section title="Earning Cashback" brandColor={brandColor} txtColor={txtColor}>
            <p>Cashback is calculated on the net amount you pay per visit, excluding any loyalty balance already applied to that visit.</p>
            <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {rewardsConfig.tiers.map((tier) => (
                <li key={tier.slug}>
                  <strong>{tier.name}</strong>: {tier.cashback_rate}% cashback per visit
                </li>
              ))}
            </ul>
            {hasMultipleTiers && (
              <p>You start at {baseTier.cashback_rate}% and can earn up to {maxTier.cashback_rate}% by reaching higher tiers. Tier upgrades are applied automatically once the required criteria are met.</p>
            )}
            <p>Cashback is credited to your balance after each qualifying visit and is visible on your digital wallet card.</p>
          </Section>

          {divider}

          <Section title="Redeeming Your Balance" brandColor={brandColor} txtColor={txtColor}>
            <p>Your cashback balance can be used as a discount on future purchases at {studioName}. Cashback has no cash value, cannot be transferred to another person, and cannot be exchanged for cash.</p>
            <p>{studioName} may set a minimum balance requirement for redemption. Your balance does not expire as long as your account remains active (at least one visit per 24 months).</p>
          </Section>

          {referrals.enabled && (
            <>
              {divider}
              <Section title="Referrals" brandColor={brandColor} txtColor={txtColor}>
                <p>You may invite friends using your personal referral link. When a referred friend makes their first qualifying purchase, you earn a {referrals.referrer_commission_rate}% commission on their spending for {referrals.referrer_commission_duration_days} days.</p>
                {referrals.friend_welcome_bonus > 0 && (
                  <p>Your friend also receives a welcome bonus on their first purchase as a thank-you for joining.</p>
                )}
                <p>Referral abuse — including self-referral, fictitious accounts, or manipulation of the referral system — will result in immediate account suspension and forfeiture of any accrued balance.</p>
              </Section>
            </>
          )}

          {divider}

          <Section title="Changes & Termination" brandColor={brandColor} txtColor={txtColor}>
            <p>{studioName} may update cashback rates or tier structure with 30 days&apos; notice communicated via the contact details on your account.</p>
            <p>You may close your account at any time by contacting {studioName} directly. Upon closure, your remaining balance is forfeited. {studioName} may suspend or terminate accounts that violate these terms.</p>
          </Section>

          {divider}

          {/* ── PRIVACY POLICY ── */}
          <p style={{ color: brandColor, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
            Privacy Policy
          </p>

          <Section title="Who Is Responsible" brandColor={brandColor} txtColor={txtColor}>
            <p>
              <strong>{studioName}</strong> is the data controller for personal data collected through this loyalty programme.
            </p>
            {(email || phone || address) && (
              <p style={{ color: mutedColor }}>
                {[email, phone, address].filter(Boolean).join(' · ')}
              </p>
            )}
          </Section>

          {divider}

          <Section title="What We Collect" brandColor={brandColor} txtColor={txtColor}>
            <p>When you sign up, we collect the information you provide: your name, email address, and phone number. We also record your visit history, cashback earnings, and balance for the purpose of running the loyalty programme.</p>
            <p>We do not collect payment card details. Transactions are recorded by amount only, not by payment method.</p>
          </Section>

          {divider}

          <Section title="Why We Use It" brandColor={brandColor} txtColor={txtColor}>
            <p>Your data is used to:</p>
            <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>Operate your loyalty account and calculate cashback</li>
              <li>Issue and update your digital wallet card (Apple Wallet / Google Wallet)</li>
              <li>Send you important programme notifications</li>
              <li>Comply with our legal obligations</li>
            </ul>
            <p>The legal basis is the performance of the agreement you entered into when signing up (GDPR Art. 6(1)(b)), and where applicable, your consent.</p>
          </Section>

          {divider}

          <Section title="Who We Share Data With" brandColor={brandColor} txtColor={txtColor}>
            <p>Your data is shared only as necessary to operate the programme:</p>
            <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Loyalink</strong> — the platform that powers this loyalty programme (data processor)</li>
              <li><strong>Apple / Google</strong> — to deliver your digital wallet card</li>
            </ul>
            <p>We do not sell your data to third parties or use it for advertising.</p>
          </Section>

          {divider}

          <Section title="Your Rights" brandColor={brandColor} txtColor={txtColor}>
            <p>Under GDPR you have the right to access, correct, or delete your personal data, to restrict or object to processing, and to data portability. You may exercise these rights by contacting {studioName}{email ? ` at ${email}` : ' directly'}.</p>
            <p>You also have the right to lodge a complaint with {authority}.</p>
          </Section>

          {divider}

          <Section title="Retention" brandColor={brandColor} txtColor={txtColor}>
            <p>We retain your account data for as long as you are a member and for up to 3 years after your last visit or account closure, unless a longer period is required by law (e.g. accounting records).</p>
          </Section>

          {divider}

          <Section title="Contact" brandColor={brandColor} txtColor={txtColor}>
            <p>Questions about these terms or your data? Contact {studioName}:</p>
            {email && <p><a href={`mailto:${email}`} style={{ color: brandColor }}>{email}</a></p>}
            {phone && <p>{phone}</p>}
            {address && <p style={{ color: mutedColor }}>{address}</p>}
          </Section>

        </div>

        <p style={{ color: mutedColor, fontSize: '0.75rem', marginTop: '3rem' }}>
          &copy; {year} {studioName}. Loyalty programme powered by Loyalink.
        </p>
      </div>
    </div>
  )
}

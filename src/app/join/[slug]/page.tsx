import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JoinForm } from '@/components/landing/join-form'
import { TrustBar } from '@/components/landing/trust-bar'
import { ValueStack, generateDefaultBenefits } from '@/components/landing/value-stack'
import { TierProgression } from '@/components/landing/tier-progression'
import { ReferralBanner } from '@/components/landing/referral-banner'
import { migrateRewardsConfig } from '@/types/database'
import { WalletTrustBadge } from '@/components/landing/wallet-trust-badge'
import { MARKETING_URL } from '@/lib/constants'
import {
  localizeLandingPageSettingsDefaults,
  resolveLandingPageCopy,
} from '@/lib/landing-page-defaults'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('headline, description, settings, studios(name, settings)')
    .eq('slug', slug)
    .single()

  if (!page) return { title: 'Not Found' }

  const studio = page.studios as unknown as { name: string; settings: Record<string, unknown> } | null
  const pageSettings = (page.settings ?? {}) as Record<string, unknown>
  const language = (pageSettings.language as string) ?? (studio?.settings?.language as string) ?? 'en'

  return {
    title: resolveLandingPageCopy(page.headline, 'headline', studio?.name, language),
    description: resolveLandingPageCopy(page.description, 'description', studio?.name, language) || undefined,
  }
}

export default async function JoinPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { ref: referralCode } = await searchParams
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('*, studios(id, name, settings)')
    .eq('slug', slug)
    .single()

  if (!page) notFound()

  // Increment view count (fire and forget)
  supabase
    .from('studio_landing_pages')
    .update({ view_count: (page.view_count ?? 0) + 1 })
    .eq('id', page.id)
    .then()

  const settings = (page.settings ?? {}) as {
    brandColor?: string
    backgroundColor?: string
    textColor?: string
    logoUrl?: string | null
    buttonText?: string
    showPhone?: boolean
    showEmail?: boolean
    customFields?: { id: string; label: string; type: 'text' | 'select'; required: boolean; options?: string[] }[]
    benefits?: { id: string; text: string; icon: string }[]
    showTierProgression?: boolean
    successHeading?: string
    successMessage?: string
    termsUrl?: string
  }

  // Rewards config comes from the studio. Currency + language come from this
  // landing page's own market, falling back to the studio defaults when unset.
  const studioSettings = (page.studios?.settings ?? {}) as Record<string, unknown>
  const pageSettings = (page.settings ?? {}) as Record<string, unknown>
  const rewardsConfig = migrateRewardsConfig(studioSettings.rewards_config)
  const currency = (pageSettings.currency as string) ?? (studioSettings.currency as string) ?? 'dkk'
  const language = (pageSettings.language as string) ?? (studioSettings.language as string) ?? 'en'
  const localizedSettings = localizeLandingPageSettingsDefaults(settings, page.studios?.name, language)

  // Check referral code
  let referrerName: string | null = null
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('customers')
      .select('name')
      .eq('referral_code', referralCode.toUpperCase())
      .eq('studio_id', page.studio_id)
      .single()
    if (referrer) referrerName = referrer.name
  }

  // Fetch studio logo from pass template as fallback
  let studioLogo: string | null = null
  if (!localizedSettings.logoUrl && !page.hero_image_url) {
    const { data: template } = await supabase
      .from('pass_templates')
      .select('icon_url, logo_url')
      .eq('studio_id', page.studio_id)
      .limit(1)
      .single()
    studioLogo = template?.icon_url ?? template?.logo_url ?? null
  }

  const bgColor = localizedSettings.backgroundColor || undefined
  const txtColor = localizedSettings.textColor || '#1a1a1a'
  const brandColor = localizedSettings.brandColor || '#6366f1'
  const logoSrc = localizedSettings.logoUrl || page.hero_image_url || studioLogo

  // Dynamic headline fallback — translated to studio language when no custom headline.
  const headline = resolveLandingPageCopy(page.headline, 'headline', page.studios?.name, language)
  const description = resolveLandingPageCopy(page.description, 'description', page.studios?.name, language)

  // Benefits are WYSIWYG: render the studio's saved list exactly as shown in the
  // editor. We must NOT re-sync rate text here — overwriting a customised row by
  // id silently discards edited copy and can collide with another row's text,
  // producing a duplicate line. Rate drift is surfaced (and fixed) in the editor
  // via its "Sync rates" banner instead. Fall back to defaults when unset.
  const benefits = settings.benefits ?? generateDefaultBenefits(rewardsConfig, currency, language)

  // Referral bonus details
  const showReferralBanner =
    referrerName &&
    rewardsConfig.referrals.enabled

  return (
    <div className="min-h-dvh" style={{ backgroundColor: bgColor }}>
      <div
        className="mx-auto max-w-lg px-4 space-y-8"
        style={{
          paddingTop: 'max(3rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {logoSrc && (
          <img
            src={logoSrc}
            alt=""
            className="mx-auto h-24 w-24 rounded-full object-cover"
          />
        )}

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" style={{ color: txtColor }}>
            {headline}
          </h1>
          {description && (
            <p className="text-base" style={{ color: txtColor, opacity: 0.7 }}>
              {description}
            </p>
          )}
        </div>

        <TrustBar
          signupCount={page.signup_count ?? 0}
          brandColor={brandColor}
          textColor={txtColor}
          language={language}
        />

        {showReferralBanner && referrerName && (
          <ReferralBanner
            referrerName={referrerName}
            friendWelcomeBonus={rewardsConfig.referrals.friend_welcome_bonus}
            friendCashbackRate={rewardsConfig.referrals.friend_cashback_rate}
            currency={currency}
            brandColor={brandColor}
            textColor={txtColor}
            language={language}
          />
        )}

        <JoinForm
          studioId={page.studio_id}
          landingPageId={page.id}
          brandColor={localizedSettings.brandColor}
          backgroundColor={bgColor}
          textColor={txtColor}
          buttonText={localizedSettings.buttonText}
          showEmail={localizedSettings.showEmail ?? true}
          showPhone={localizedSettings.showPhone ?? true}
          referralCode={referralCode}
          customFields={localizedSettings.customFields}
          successHeading={localizedSettings.successHeading}
          successMessage={localizedSettings.successMessage}
          termsUrl={localizedSettings.termsUrl || `${MARKETING_URL}/join/${slug}/terms`}
          language={language}
          defaultCountry={(pageSettings.address_country as string) ?? (studioSettings.address_country as string) ?? undefined}
        />

        <WalletTrustBadge textColor={txtColor} />

        <ValueStack
          benefits={benefits}
          brandColor={brandColor}
          textColor={txtColor}
          language={language}
        />

        {(localizedSettings.showTierProgression ?? true) && (
          <TierProgression
            tiers={rewardsConfig.tiers}
            currency={currency}
            brandColor={brandColor}
            textColor={txtColor}
            language={language}
          />
        )}

        <p className="text-center text-[10px] opacity-20 pt-4" style={{ color: txtColor }}>
          Powered by Loyalink
        </p>
      </div>
    </div>
  )
}

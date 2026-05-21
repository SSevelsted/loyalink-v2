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
import { getSignupTranslations } from '@/lib/i18n/signup'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('headline, description, studios(settings)')
    .eq('slug', slug)
    .single()

  if (!page) return { title: 'Not Found' }

  const studio = page.studios as unknown as { settings: Record<string, unknown> } | null
  const language = (studio?.settings?.language as string) ?? 'en'
  const t = getSignupTranslations(language)

  return {
    title: page.headline ?? t.fallbackJoinTitle,
    description: page.description ?? undefined,
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
  const t = getSignupTranslations(language)
  const baseTier = rewardsConfig.tiers[0]

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
  if (!settings.logoUrl && !page.hero_image_url) {
    const { data: template } = await supabase
      .from('pass_templates')
      .select('icon_url, logo_url')
      .eq('studio_id', page.studio_id)
      .limit(1)
      .single()
    studioLogo = template?.icon_url ?? template?.logo_url ?? null
  }

  const bgColor = settings.backgroundColor || undefined
  const txtColor = settings.textColor || '#1a1a1a'
  const brandColor = settings.brandColor || '#6366f1'
  const logoSrc = settings.logoUrl || page.hero_image_url || studioLogo

  // Dynamic headline fallback — translated to studio language when no custom headline.
  const headline = page.headline ?? t.fallbackHeadline(baseTier.cashback_rate)

  // Benefits: use stored list if customised, but always keep rate-derived rows in sync
  // with the live rewards config so they don't show a stale % after a config change.
  const maxTier = rewardsConfig.tiers[rewardsConfig.tiers.length - 1]
  const benefits = settings.benefits
    ? settings.benefits.map((b) => {
        if (b.id === 'base_cashback') return { ...b, text: t.benefitBaseCashback(baseTier.cashback_rate) }
        if (b.id === 'max_cashback') return { ...b, text: t.benefitMaxCashback(maxTier.cashback_rate) }
        return b
      })
    : generateDefaultBenefits(rewardsConfig, currency, language)

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
          {page.description && (
            <p className="text-base" style={{ color: txtColor, opacity: 0.7 }}>
              {page.description}
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
          brandColor={settings.brandColor}
          backgroundColor={bgColor}
          textColor={txtColor}
          buttonText={settings.buttonText}
          showEmail={settings.showEmail ?? true}
          showPhone={settings.showPhone ?? true}
          referralCode={referralCode}
          customFields={settings.customFields}
          successHeading={settings.successHeading}
          successMessage={settings.successMessage}
          termsUrl={settings.termsUrl || `${MARKETING_URL}/join/${slug}/terms`}
          language={language}
        />

        <WalletTrustBadge textColor={txtColor} />

        <ValueStack
          benefits={benefits}
          brandColor={brandColor}
          textColor={txtColor}
          language={language}
        />

        {(settings.showTierProgression ?? true) && (
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

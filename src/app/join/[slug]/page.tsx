import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JoinForm } from '@/components/landing/join-form'
import { TrustBar } from '@/components/landing/trust-bar'
import { ValueStack, generateDefaultBenefits } from '@/components/landing/value-stack'
import { TierProgression } from '@/components/landing/tier-progression'
import { ReferralBanner } from '@/components/landing/referral-banner'
import { migrateRewardsConfig } from '@/types/database'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('headline, description')
    .eq('slug', slug)
    .single()

  if (!page) return { title: 'Not Found' }

  return {
    title: page.headline ?? 'Join',
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

  // Extract rewards config and currency from studio settings
  const studioSettings = (page.studios?.settings ?? {}) as Record<string, unknown>
  const rewardsConfig = migrateRewardsConfig(studioSettings.rewards_config)
  const currency = (studioSettings.currency as string) ?? 'dkk'
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

  const bgColor = settings.backgroundColor || undefined
  const txtColor = settings.textColor || '#1a1a1a'
  const brandColor = settings.brandColor || '#6366f1'
  const logoSrc = settings.logoUrl || page.hero_image_url

  // Dynamic headline fallback
  const headline = page.headline ?? `Get ${baseTier.cashback_rate}% Back on Every Visit`

  // Referral bonus details
  const showReferralBanner =
    referrerName &&
    rewardsConfig.referrals.enabled

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <div className="mx-auto max-w-lg px-4 py-12 space-y-8">
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
        />

        {showReferralBanner && referrerName && (
          <ReferralBanner
            referrerName={referrerName}
            friendWelcomeBonus={rewardsConfig.referrals.friend_welcome_bonus}
            friendCashbackRate={rewardsConfig.referrals.friend_cashback_rate}
            currency={currency}
            brandColor={brandColor}
            textColor={txtColor}
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
          termsUrl={settings.termsUrl}
        />

        <ValueStack
          benefits={settings.benefits ?? generateDefaultBenefits(rewardsConfig, currency)}
          brandColor={brandColor}
          textColor={txtColor}
        />

        {(settings.showTierProgression ?? true) && (
          <TierProgression
            tiers={rewardsConfig.tiers}
            currency={currency}
            brandColor={brandColor}
            textColor={txtColor}
          />
        )}

        <p className="text-center text-[10px] opacity-20 pt-4" style={{ color: txtColor }}>
          Powered by Loyalink
        </p>
      </div>
    </div>
  )
}

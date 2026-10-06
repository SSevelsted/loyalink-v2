import { adminSupabase } from '@/lib/studio-access'
import { customAlphabet } from 'nanoid'
import { notFound } from 'next/navigation'

const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)
import { GiftFlow } from './gift-flow'
import { firstName } from '@/lib/member-privacy'
import { friendGift, giftHeadlineVariant } from '@/lib/referral-gift'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type Props = {
  params: Promise<{ memberId: string }>
}

export default async function ReferralLandingPage({ params }: Props) {
  const { memberId } = await params
  // Public page: read with the service key on the server (RLS gives anon no
  // access). Only fields rendered below reach the browser.
  const supabase = adminSupabase

  // Look up the referrer customer
  let customer
  const { data: byMemberId } = await supabase
    .from('customers')
    .select('id, name, referral_code, studio_id, currency, language, landing_page_id, studios:studio_id(id, name, slug, settings)')
    .eq('member_id', memberId)
    .single()

  if (byMemberId) {
    customer = byMemberId
  } else {
    const { data: byId } = await supabase
      .from('customers')
      .select('id, name, referral_code, studio_id, currency, language, landing_page_id, studios:studio_id(id, name, slug, settings)')
      .eq('id', memberId)
      .single()
    customer = byId
  }

  if (!customer) notFound()

  // Some legacy/edge creation paths never assigned a referral_code. Generate one
  // lazily (and persist it) so a customer's referral QR never dead-ends on a 404.
  let referralCode = customer.referral_code as string | null
  if (!referralCode) {
    referralCode = generateReferralCode()
    await adminSupabase.from('customers').update({ referral_code: referralCode }).eq('id', customer.id)
  }

  const studio = customer.studios as unknown as { id: string; name: string; slug: string; settings: Record<string, unknown> } | null
  if (!studio) notFound()

  const studioSettings = studio.settings ?? {}
  const rewardsConfig: RewardsConfig = studioSettings.rewards_config
    ? migrateRewardsConfig(studioSettings.rewards_config)
    : DEFAULT_REWARDS_CONFIG
  // The referred friend joins the referrer's market, so this page renders in the
  // referrer's currency/language (fallback: studio settings).
  const currency = (customer.currency as string) ?? (studioSettings.currency as string) ?? 'dkk'
  const language = (customer.language as string) ?? (studioSettings.language as string) ?? 'en'
  const currencyCfg = getCurrencyConfig(currency)

  // Branding comes from the referrer's own landing page (their market) when known,
  // otherwise the studio's first landing page.
  const landingPageQuery = customer.landing_page_id
    ? supabase.from('studio_landing_pages').select('id, settings, hero_image_url').eq('id', customer.landing_page_id)
    : supabase.from('studio_landing_pages').select('id, settings, hero_image_url').eq('studio_id', customer.studio_id).limit(1)
  const { data: landingPage } = await landingPageQuery.maybeSingle()

  const settings = (landingPage?.settings ?? {}) as {
    brandColor?: string
    backgroundColor?: string
    textColor?: string
    logoUrl?: string | null
  }

  const bgColor = settings.backgroundColor || undefined
  const txtColor = settings.textColor || undefined
  const logoSrc = settings.logoUrl || landingPage?.hero_image_url || null
  const gift = friendGift(rewardsConfig)

  return (
    <GiftFlow
      studioId={customer.studio_id}
      studioName={studio.name}
      logoSrc={logoSrc}
      landingPageId={landingPage?.id ?? ''}
      giverFirstName={firstName(customer.name)}
      bonusLabel={giftHeadlineVariant(gift.bonus) === 'bonus' ? formatAmount(gift.bonus, currencyCfg) : null}
      rate={gift.rate}
      brandColor={settings.brandColor || '#7C3AED'}
      backgroundColor={bgColor}
      textColor={txtColor}
      referralCode={referralCode}
      language={language}
      defaultCountry={(studioSettings.address_country as string) ?? undefined}
    />
  )
}

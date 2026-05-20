import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import type { Metadata } from 'next'
import { SuccessHub } from './success-hub'
import { createCustomerAccessToken } from '@/lib/customer-access'
import { getSignupTranslations } from '@/lib/i18n/signup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Props = {
  params: Promise<{ studioId: string }>
  searchParams: Promise<{ customerId?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params
  const { data: studio } = await supabase
    .from('studios')
    .select('name, settings')
    .eq('id', studioId)
    .single()

  const language = (studio?.settings as { language?: string } | null)?.language ?? 'en'
  const t = getSignupTranslations(language)
  return {
    title: studio ? t.welcomeMetaTitle(studio.name) : t.welcomeName(''),
  }
}

export default async function ReferralSuccessPage({ params, searchParams }: Props) {
  const { studioId } = await params
  const { customerId } = await searchParams

  if (!customerId) notFound()

  // Fetch customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, balance, cashback_rate, metadata')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .single()

  if (!customer) notFound()

  // Fetch studio
  const { data: studio } = await supabase
    .from('studios')
    .select('name, settings')
    .eq('id', studioId)
    .single()

  if (!studio) notFound()

  const studioSettings = studio.settings as Record<string, unknown> | null
  const rewardsConfig: RewardsConfig = studioSettings?.rewards_config
    ? migrateRewardsConfig(studioSettings.rewards_config)
    : DEFAULT_REWARDS_CONFIG
  const studioCurrency = (studioSettings?.currency as string) ?? 'dkk'
  const studioLanguage = (studioSettings?.language as string) ?? 'en'

  // Fetch landing page for branding
  const { data: landingPage } = await supabase
    .from('studio_landing_pages')
    .select('settings')
    .eq('studio_id', studioId)
    .limit(1)
    .single()

  const branding = (landingPage?.settings ?? {}) as {
    brandColor?: string
    backgroundColor?: string
    textColor?: string
    logoUrl?: string | null
  }

  // Fetch referrer name
  let referrerName: string | null = null
  const { data: referral } = await supabase
    .from('referrals')
    .select('referrer_customer_id')
    .eq('referred_customer_id', customerId)
    .limit(1)
    .single()

  if (referral) {
    const { data: referrer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', referral.referrer_customer_id)
      .single()
    referrerName = referrer?.name ?? null
  }

  // Member count for trust bar
  const { count: memberCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)

  const metadata = (customer.metadata as Record<string, unknown>) ?? {}
  const passUrl = (metadata.pass_url as string) ?? null
  const passPlatform = (metadata.pass_platform as 'apple' | 'google') ?? 'apple'

  return (
    <SuccessHub
      customerId={customer.id}
      customerAccessToken={createCustomerAccessToken(customer.id, 24 * 60 * 60)}
      customerName={customer.name}
      balance={customer.balance}
      cashbackRate={Number(customer.cashback_rate ?? rewardsConfig.tiers[0].cashback_rate)}
      welcomeBonus={rewardsConfig.referrals.friend_welcome_bonus}
      studioName={studio.name}
      brandColor={branding.brandColor || '#6366f1'}
      backgroundColor={branding.backgroundColor}
      textColor={branding.textColor}
      logoUrl={branding.logoUrl ?? null}
      passUrl={passUrl}
      passPlatform={passPlatform}
      referrerName={referrerName}
      memberCount={memberCount ?? 0}
      currency={studioCurrency}
      language={studioLanguage}
    />
  )
}

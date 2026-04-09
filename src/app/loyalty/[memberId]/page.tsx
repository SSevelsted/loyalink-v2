import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig, Referral, Transaction } from '@/types/database'
import { LoyaltyHub } from './loyalty-hub'
import { createCustomerAccessToken } from '@/lib/customer-access'

type Props = {
  params: Promise<{ memberId: string }>
}

export default async function LoyaltyPage({ params }: Props) {
  const { memberId } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Look up customer by member_id (nanoid) or id
  let customer
  const { data: byMemberId } = await supabase
    .from('customers')
    .select('*, studios:studio_id(id, name, slug, settings)')
    .eq('member_id', memberId)
    .single()

  if (byMemberId) {
    customer = byMemberId
  } else {
    const { data: byId } = await supabase
      .from('customers')
      .select('*, studios:studio_id(id, name, slug, settings)')
      .eq('id', memberId)
      .single()
    customer = byId
  }

  if (!customer) notFound()

  const studio = customer.studios as { id: string; name: string; slug: string; settings: Record<string, unknown> } | null
  const studioSettings = studio?.settings ?? {}
  const rewardsConfig: RewardsConfig = studioSettings.rewards_config
    ? migrateRewardsConfig(studioSettings.rewards_config)
    : DEFAULT_REWARDS_CONFIG

  // Get landing page for branding
  const { data: landingPage } = await supabase
    .from('studio_landing_pages')
    .select('settings, hero_image_url')
    .eq('studio_id', customer.studio_id)
    .limit(1)
    .single()

  // Get referrals with referred customer details for granular step tracking
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*, referred_customer:referred_customer_id(name, has_purchased, metadata)')
    .eq('referrer_customer_id', customer.id)
    .order('created_at', { ascending: false })

  // Get transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, amount, description, created_at')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const currency = (studioSettings.currency as string) ?? 'kr'
  const language = (studioSettings.language as string) ?? 'en'

  const branding = (landingPage?.settings ?? {}) as Record<string, unknown>
  const logoUrl = (branding.logoUrl as string) ?? landingPage?.hero_image_url ?? null
  const avatarUrl = ((customer.metadata as Record<string, unknown>)?.avatar_url as string) ?? null

  return (
    <Suspense>
      <LoyaltyHub
        memberId={memberId}
        customerAccessToken={createCustomerAccessToken(customer.id, 24 * 60 * 60)}
        avatarUrl={avatarUrl}
        customer={{
          id: customer.id,
          name: customer.name,
          balance: customer.balance,
          cashback_rate: customer.cashback_rate,
          loyalty_stage: customer.loyalty_stage,
          referral_code: customer.referral_code ?? null,
          referral_count: customer.referral_count ?? 0,
        }}
        studio={{
          id: studio?.id ?? '',
          name: studio?.name ?? '',
          slug: studio?.slug ?? '',
        }}
        branding={branding}
        logoUrl={logoUrl}
        rewardsConfig={rewardsConfig}
        referrals={(referrals ?? []) as (Referral & { referred_customer: { name: string; has_purchased: boolean; metadata: Record<string, unknown> | null } })[]}
        transactions={(transactions ?? []) as Transaction[]}
        currency={currency}
        language={language}
      />
    </Suspense>
  )
}

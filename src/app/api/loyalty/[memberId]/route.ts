import { NextRequest, NextResponse } from 'next/server'
import { anonSupabase as supabase } from '@/lib/studio-access'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig } from '@/types/database'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params

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
    // Fallback to ID lookup
    const { data: byId } = await supabase
      .from('customers')
      .select('*, studios:studio_id(id, name, slug, settings)')
      .eq('id', memberId)
      .single()
    customer = byId
  }

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

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

  // Get referrals
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*, referred_customer:referred_customer_id(name)')
    .eq('referrer_customer_id', customer.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      balance: customer.balance,
      cashback_rate: customer.cashback_rate,
      loyalty_stage: customer.loyalty_stage,
      referral_code: customer.referral_code,
      referral_count: customer.referral_count,
      has_purchased: customer.has_purchased,
    },
    studio: {
      id: studio?.id,
      name: studio?.name,
      slug: studio?.slug,
    },
    branding: landingPage?.settings ?? {},
    logoUrl: (landingPage?.settings as Record<string, unknown>)?.logoUrl ?? landingPage?.hero_image_url ?? null,
    rewardsConfig,
    referrals: referrals ?? [],
  })
}

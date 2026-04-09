import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, getSessionUser, isStudioMember } from '@/lib/studio-access'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG } from '@/types/database'

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')

  if (!studioId) {
    return NextResponse.json({ error: 'studioId is required' }, { status: 400 })
  }

  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isMember = await isStudioMember(user.id, studioId)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get current friend_tier_slug from config
  const { data: studio } = await adminSupabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()

  const settings = studio?.settings as Record<string, unknown> | null
  const config = settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : DEFAULT_REWARDS_CONFIG

  const friendTierSlug = config.referrals?.friend_tier_slug

  // Count referred customers still on the friend tier
  let referredFriends = 0
  if (friendTierSlug) {
    const { data: referred } = await adminSupabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studioId)
      .eq('loyalty_stage', friendTierSlug)
      .not('referral_code', 'is', null)

    // Fallback: count customers who were referred (have a referral row)
    const { count } = await adminSupabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studioId)

    // Use referral count as a proxy for referred friends on the tier
    const { data: friendsOnTier } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId)
      .eq('loyalty_stage', friendTierSlug)

    referredFriends = friendsOnTier?.length ?? 0
  }

  // Count active referrals (for commission duration changes)
  const { data: activeReferrals } = await adminSupabase
    .from('referrals')
    .select('id')
    .eq('studio_id', studioId)
    .eq('status', 'activated')

  return NextResponse.json({
    referredFriends,
    activeReferrals: activeReferrals?.length ?? 0,
  })
}

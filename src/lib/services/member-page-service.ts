import { adminSupabase } from '@/lib/studio-access'
import { createCustomerAccessToken, hasPersonalDataAccess, memberLinkVersion } from '@/lib/customer-access'
import { firstName, friendDisplayName } from '@/lib/member-privacy'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig, Referral, Transaction } from '@/types/database'

/**
 * Data for the member page /loyalty/[memberId].
 *
 * The page is public: the URL holds only the member id, which is also on the
 * card's QR code. So personal data needs a token in ?token=: the customer
 * access token (Loyalink emails, 24h) or the member link token (API
 * invite_link and the pass back-field link; no expiry, revoked by rotating
 * customers.link_token_version):
 *
 *   full    token valid for this member. Balance, activity, friends.
 *   public  no token or a bad one. The card and Add to Wallet only, the
 *           first name, and the studio's referral offer. The page gets a
 *           pass-only token so Add to Wallet keeps working.
 *
 * Friends always show as first name + last initial, never the full name.
 */

export type MemberPageAccess = 'full' | 'public'

export type MemberPageReferral = Referral & {
  referred_customer: { name: string; has_purchased: boolean; metadata: { pass_downloaded: boolean } | null }
}

export type MemberPageData = {
  access: MemberPageAccess
  customerAccessToken: string
  avatarUrl: string | null
  customer: {
    id: string
    name: string
    balance: number | null
    cashback_rate: number | null
    loyalty_stage: string
    referral_code: string | null
    referral_count: number
  }
  studio: { id: string; name: string; slug: string }
  branding: Record<string, unknown>
  logoUrl: string | null
  rewardsConfig: RewardsConfig
  referrals: MemberPageReferral[]
  transactions: Transaction[]
  currency: string
  language: string
}

const TOKEN_TTL_SECONDS = 24 * 60 * 60

type CustomerRow = Record<string, unknown> & {
  id: string
  studio_id: string
  name: string
  studios: { id: string; name: string; slug: string; settings: Record<string, unknown> | null } | null
}

/** Look up the member by member_id (nanoid) or by id. */
async function findCustomer(memberId: string): Promise<CustomerRow | null> {
  const select = '*, studios:studio_id(id, name, slug, settings)'
  const { data: byMemberId } = await adminSupabase.from('customers').select(select).eq('member_id', memberId).maybeSingle()
  if (byMemberId) return byMemberId as unknown as CustomerRow
  const { data: byId } = await adminSupabase.from('customers').select(select).eq('id', memberId).maybeSingle()
  return (byId as unknown as CustomerRow | null) ?? null
}

export async function loadMemberPage(memberId: string, token: string | null | undefined): Promise<MemberPageData | null> {
  const customer = await findCustomer(memberId)
  if (!customer) return null

  const access: MemberPageAccess = hasPersonalDataAccess(token, customer.id, memberLinkVersion(customer)) ? 'full' : 'public'
  const studio = customer.studios
  const studioSettings = studio?.settings ?? {}
  const rewardsConfig: RewardsConfig = studioSettings.rewards_config
    ? migrateRewardsConfig(studioSettings.rewards_config)
    : DEFAULT_REWARDS_CONFIG

  // Landing page for branding
  const { data: landingPage } = await adminSupabase
    .from('studio_landing_pages')
    .select('settings, hero_image_url')
    .eq('studio_id', customer.studio_id)
    .limit(1)
    .maybeSingle()

  let referrals: MemberPageReferral[] = []
  let transactions: Transaction[] = []
  if (access === 'full') {
    const { data: referralRows } = await adminSupabase
      .from('referrals')
      .select('*, referred_customer:referred_customer_id(name, has_purchased, metadata)')
      .eq('referrer_customer_id', customer.id)
      .order('created_at', { ascending: false })

    // Only what the page needs from the friend: a short name, has_purchased
    // and whether the pass was added. Their metadata never reaches the browser.
    referrals = ((referralRows ?? []) as Array<Referral & {
      referred_customer: { name: string | null; has_purchased: boolean | null; metadata: Record<string, unknown> | null } | null
    }>).map((r) => ({
      ...r,
      referred_customer: {
        name: friendDisplayName(r.referred_customer?.name),
        has_purchased: !!r.referred_customer?.has_purchased,
        metadata: { pass_downloaded: !!r.referred_customer?.metadata?.pass_downloaded },
      },
    }))

    const { data: transactionRows } = await adminSupabase
      .from('transactions')
      .select('id, type, amount, description, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20)
    transactions = (transactionRows ?? []) as Transaction[]
  }

  // The customer's stamped market wins; studio settings are the fallback.
  const currency = (customer.currency as string) ?? (studioSettings.currency as string) ?? 'kr'
  const language = (customer.language as string) ?? (studioSettings.language as string) ?? 'en'

  const branding = ((landingPage?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>
  const logoUrl = (branding.logoUrl as string) ?? (landingPage?.hero_image_url as string | null) ?? null
  const avatarUrl = ((customer.metadata as Record<string, unknown> | null)?.avatar_url as string) ?? null

  const full = access === 'full'
  return {
    access,
    customerAccessToken: createCustomerAccessToken(customer.id, TOKEN_TTL_SECONDS, { passOnly: !full }),
    avatarUrl: full ? avatarUrl : null,
    customer: {
      id: customer.id,
      name: full ? customer.name : firstName(customer.name),
      balance: full ? Number(customer.balance ?? 0) : null,
      cashback_rate: full ? ((customer.cashback_rate as number | null) ?? null) : null,
      loyalty_stage: (customer.loyalty_stage as string) ?? rewardsConfig.tiers[0].slug,
      referral_code: (customer.referral_code as string | null) ?? null,
      referral_count: full ? Number(customer.referral_count ?? 0) : 0,
    },
    studio: { id: studio?.id ?? '', name: studio?.name ?? '', slug: studio?.slug ?? '' },
    branding,
    logoUrl,
    rewardsConfig,
    referrals,
    transactions,
    currency,
    language,
  }
}

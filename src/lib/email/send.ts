/**
 * Email send service — fire-and-forget functions for every email type.
 * Each function fetches its own data, renders the template, and sends via Resend.
 * Errors are caught and logged, never thrown.
 */
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getResend, FROM } from '@/lib/resend'
import { createCustomerAccessToken } from '@/lib/customer-access'
import { PLATFORM_URL, MARKETING_URL } from '@/lib/constants'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import { getStudioStats, getStudioOwner, hasPaymentMethod } from './stats'
import {
  studioWelcomeEmail,
  trialWarningEmail,
  trialExpiredEmail,
  subscriptionConfirmedEmail,
  customerWelcomeEmail,
  passReminderEmail,
  passRemovedEmail,
  transactionReceiptEmail,
  resendPassLinkEmail,
  tierUpgradeEmail,
  referralRewardEmail,
  winBackEmail,
} from './templates'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function canSend(): boolean {
  return !!process.env.RESEND_API_KEY
}

async function send(to: string, email: { subject: string; html: string }): Promise<void> {
  await getResend().emails.send({ from: FROM, to, subject: email.subject, html: email.html })
}

function getRewardsConfig(settings: Record<string, unknown> | null): RewardsConfig {
  return settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : DEFAULT_REWARDS_CONFIG
}

async function getStudioCurrency(studioId: string): Promise<string> {
  const { data } = await supabase.from('studios').select('settings').eq('id', studioId).single()
  const settings = data?.settings as Record<string, unknown> | null
  return (settings?.currency as string) ?? 'kr'
}

// ──────────────────────────────────────────
// Studio Owner Emails
// ──────────────────────────────────────────

/** 1.1 Welcome email after studio signup */
export function sendStudioWelcome(
  email: string, ownerName: string, studioName: string, plan: string, trialEndsAt: string,
): void {
  if (!canSend()) return
  const planLabel = plan === 'pro' ? 'Pro' : 'Basic'
  const trialEnd = new Date(trialEndsAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const tpl = studioWelcomeEmail({
    ownerName: ownerName.trim(),
    studioName: studioName.trim(),
    planLabel,
    trialEnd,
    setupUrl: `${PLATFORM_URL}/setup`,
  })

  send(email.trim(), tpl).catch(err => console.error('[email] studio welcome error:', err))
}

/** 1.2 + 1.3 Trial warning (5 days / 1 day, with payment method variant) */
export async function sendTrialWarning(
  studioId: string, daysLeft: 5 | 1,
): Promise<{ status: string }> {
  if (!canSend()) return { status: 'skipped' }

  const owner = await getStudioOwner(studioId)
  if (!owner) return { status: 'no_owner' }

  const [stats, hasPM, studioRes] = await Promise.all([
    getStudioStats(studioId),
    hasPaymentMethod(studioId),
    supabase.from('studios').select('name, settings, trial_ends_at').eq('id', studioId).single(),
  ])

  const studio = studioRes.data
  if (!studio) return { status: 'no_studio' }

  const settings = studio.settings as Record<string, unknown> | null
  const planLabel = (settings?.plan as string) === 'pro' ? 'Pro' : 'Basic'
  const currency = (settings?.currency as string) ?? 'kr'
  const trialEnd = studio.trial_ends_at
    ? new Date(studio.trial_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const tpl = trialWarningEmail({
    ownerName: owner.name,
    studioName: studio.name,
    planLabel,
    daysLeft,
    hasPaymentMethod: hasPM,
    customerCount: stats.customerCount,
    totalBalance: stats.totalBalance,
    transactionCount: stats.transactionCount,
    trialEndDate: trialEnd,
    currency,
    dashboardUrl: `${PLATFORM_URL}/dashboard`,
    billingUrl: `${PLATFORM_URL}/settings?tab=billing`,
  })

  await send(owner.email, tpl)
  return { status: 'sent' }
}

/** 1.4 Trial expired — sent day after trial ends */
export async function sendTrialExpired(studioId: string): Promise<{ status: string }> {
  if (!canSend()) return { status: 'skipped' }

  const owner = await getStudioOwner(studioId)
  if (!owner) return { status: 'no_owner' }

  const tpl = trialExpiredEmail({
    ownerName: owner.name,
    billingUrl: `${PLATFORM_URL}/settings?tab=billing`,
  })

  await send(owner.email, tpl)
  return { status: 'sent' }
}

/** 1.5 Subscription confirmed — first payment */
export async function sendSubscriptionConfirmed(studioId: string): Promise<void> {
  if (!canSend()) return

  const [owner, studioRes] = await Promise.all([
    getStudioOwner(studioId),
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
  ])

  if (!owner || !studioRes.data) return

  const settings = studioRes.data.settings as Record<string, unknown> | null
  const plan = (settings?.plan as string) ?? 'basic'

  const tpl = subscriptionConfirmedEmail({
    ownerName: owner.name,
    studioName: studioRes.data.name,
    planLabel: plan === 'pro' ? 'Pro' : 'Basic',
    isPro: plan === 'pro',
    automationsUrl: `${PLATFORM_URL}/notifications/automations`,
  })

  await send(owner.email, tpl)
}

// ──────────────────────────────────────────
// Customer Emails
// ──────────────────────────────────────────

/** 2.1 Customer welcome — after joining loyalty program */
export async function sendCustomerWelcome(customerId: string, studioId: string): Promise<void> {
  if (!canSend()) return

  const [{ data: customer }, { data: studio }, { data: pass }] = await Promise.all([
    supabase.from('customers').select('name, email, balance, cashback_rate, loyalty_stage, member_id, id').eq('id', customerId).single(),
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
    supabase.from('wallet_passes').select('status').eq('customer_id', customerId).eq('status', 'installed').limit(1).maybeSingle(),
  ])

  if (!customer?.email || !studio) return

  const settings = studio.settings as Record<string, unknown> | null
  const config = getRewardsConfig(settings)
  const currency = (settings?.currency as string) ?? 'kr'
  const tier = config.tiers.find(t => t.slug === customer.loyalty_stage) ?? config.tiers[0]

  const memberId = customer.member_id || customer.id
  const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)
  const passLink = `${MARKETING_URL}/loyalty/${memberId}?addPass=1&token=${token}`

  const tpl = customerWelcomeEmail({
    customerName: customer.name,
    studioName: studio.name,
    cashbackRate: Number(customer.cashback_rate),
    balance: Number(customer.balance ?? 0),
    tierName: tier.name,
    currency,
    passInstalled: !!pass,
    passLink,
  })

  send(customer.email, tpl).catch(err => console.error('[email] customer welcome error:', err))
}

/** 2.2 Pass reminder — 24-48h after signup, pass not installed */
export async function sendPassReminder(customerId: string, studioId: string): Promise<void> {
  if (!canSend()) return

  const [{ data: customer }, { data: studio }] = await Promise.all([
    supabase.from('customers').select('name, email, cashback_rate, member_id, id').eq('id', customerId).single(),
    supabase.from('studios').select('name').eq('id', studioId).single(),
  ])

  if (!customer?.email || !studio) return

  const memberId = customer.member_id || customer.id
  const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)
  const passLink = `${MARKETING_URL}/loyalty/${memberId}?addPass=1&token=${token}`

  const tpl = passReminderEmail({
    customerName: customer.name,
    studioName: studio.name,
    cashbackRate: Number(customer.cashback_rate),
    passLink,
  })

  await send(customer.email, tpl)
}

/** 2.3 Pass removed from wallet */
export async function sendPassRemoved(customerId: string, studioId: string): Promise<void> {
  if (!canSend()) return

  const [{ data: customer }, { data: studio }] = await Promise.all([
    supabase.from('customers').select('name, email, balance, cashback_rate, member_id, id').eq('id', customerId).single(),
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
  ])

  if (!customer?.email || !studio) return

  const settings = studio.settings as Record<string, unknown> | null
  const currency = (settings?.currency as string) ?? 'kr'
  const memberId = customer.member_id || customer.id
  const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)
  const passLink = `${MARKETING_URL}/loyalty/${memberId}?addPass=1&token=${token}`

  const tpl = passRemovedEmail({
    customerName: customer.name,
    studioName: studio.name,
    currentBalance: Number(customer.balance ?? 0),
    cashbackRate: Number(customer.cashback_rate),
    currency,
    passLink,
  })

  await send(customer.email, tpl)
}

/** 2.4 Transaction receipt */
export type ReceiptData = {
  amount: number
  balanceUsed: number
  chargeOnPOS: number | null
  cashbackEarned: number
  cashbackRate: number
  newBalance: number
  tierName: string
  tierUpgraded: boolean
  newTierName?: string
  newCashbackRate?: number
  nextTierName?: string
  nextTierRate?: number
  amountToNextTier?: number
}

export async function sendTransactionReceipt(
  customerId: string, studioId: string, txData: ReceiptData,
): Promise<void> {
  if (!canSend()) return

  const [{ data: customer }, { data: studio }] = await Promise.all([
    supabase.from('customers').select('name, email').eq('id', customerId).single(),
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
  ])

  if (!customer?.email || !studio) return

  const settings = studio.settings as Record<string, unknown> | null
  const currency = (settings?.currency as string) ?? 'kr'

  const tpl = transactionReceiptEmail({
    customerName: customer.name,
    studioName: studio.name,
    currency,
    ...txData,
  })

  await send(customer.email, tpl)
}

/** 2.5 Resend pass link (manual request) */
export async function sendResendPassLink(customerId: string, studioId: string): Promise<void> {
  if (!canSend()) return

  const [{ data: customer }, { data: studio }] = await Promise.all([
    supabase.from('customers').select('name, email, member_id, id').eq('id', customerId).single(),
    supabase.from('studios').select('name').eq('id', studioId).single(),
  ])

  if (!customer?.email || !studio) return

  const memberId = customer.member_id || customer.id
  const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)
  const passLink = `${MARKETING_URL}/loyalty/${memberId}?addPass=1&token=${token}`

  const tpl = resendPassLinkEmail({
    customerName: customer.name ?? '',
    studioName: studio.name,
    passLink,
  })

  await send(customer.email, tpl)
}

/** 2.6 Tier upgrade notification */
export async function sendTierUpgrade(
  customerId: string, studioId: string, fromTierSlug: string, toTierSlug: string,
): Promise<void> {
  if (!canSend()) return

  const [{ data: customer }, { data: studio }] = await Promise.all([
    supabase.from('customers').select('name, email, balance').eq('id', customerId).single(),
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
  ])

  if (!customer?.email || !studio) return

  const settings = studio.settings as Record<string, unknown> | null
  const config = getRewardsConfig(settings)
  const currency = (settings?.currency as string) ?? 'kr'

  const fromTier = config.tiers.find(t => t.slug === fromTierSlug) ?? config.tiers[0]
  const toTier = config.tiers.find(t => t.slug === toTierSlug)
  if (!toTier) return

  // Calculate lifetime cashback
  const { data: cashbackTxs } = await supabase
    .from('transactions')
    .select('amount')
    .eq('customer_id', customerId)
    .eq('studio_id', studioId)
    .in('type', ['cashback', 'referral_commission', 'adjustment'])

  const lifetimeCashback = (cashbackTxs ?? []).reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const tpl = tierUpgradeEmail({
    customerName: customer.name,
    studioName: studio.name,
    newTierName: toTier.name,
    newCashbackRate: toTier.cashback_rate,
    oldCashbackRate: fromTier.cashback_rate,
    balance: Number(customer.balance ?? 0),
    lifetimeCashback: Math.round(lifetimeCashback),
    currency,
  })

  send(customer.email, tpl).catch(err => console.error('[email] tier upgrade error:', err))
}

/** 2.7 Referral reward notification (to the referrer) */
export async function sendReferralReward(
  referrerCustomerId: string, studioId: string, referredName: string, rewardAmount: number,
): Promise<void> {
  if (!canSend()) return

  const [{ data: referrer }, { data: studio }] = await Promise.all([
    supabase.from('customers').select('name, email, balance').eq('id', referrerCustomerId).single(),
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
  ])

  if (!referrer?.email || !studio) return

  const settings = studio.settings as Record<string, unknown> | null
  const currency = (settings?.currency as string) ?? 'kr'

  const tpl = referralRewardEmail({
    referrerName: referrer.name,
    referredName,
    studioName: studio.name,
    rewardAmount,
    newBalance: Number(referrer.balance ?? 0),
    currency,
  })

  send(referrer.email, tpl).catch(err => console.error('[email] referral reward error:', err))
}

/** 2.9 Win-back email for inactive customers */
export async function sendWinBack(customerId: string, studioId: string): Promise<void> {
  if (!canSend()) return

  const [{ data: customer }, { data: studio }] = await Promise.all([
    supabase.from('customers').select('name, email, balance, cashback_rate, metadata, member_id, id').eq('id', customerId).single(),
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
  ])

  if (!customer?.email || !studio) return

  const settings = studio.settings as Record<string, unknown> | null
  const currency = (settings?.currency as string) ?? 'kr'
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  const boost = metadata.cashback_boost as { original_rate?: number; bonus_rate?: number; expires_at?: string } | undefined

  const hasCashbackBoost = !!(boost?.expires_at && new Date(boost.expires_at) > new Date())
  const memberId = customer.member_id || customer.id
  const token = createCustomerAccessToken(customer.id, 24 * 60 * 60)

  const tpl = winBackEmail({
    customerName: customer.name,
    studioName: studio.name,
    balance: Number(customer.balance ?? 0),
    currency,
    hasCashbackBoost,
    boostedRate: hasCashbackBoost ? Number(customer.cashback_rate) : undefined,
    normalRate: hasCashbackBoost ? boost?.original_rate : undefined,
    boostExpiry: hasCashbackBoost && boost?.expires_at
      ? new Date(boost.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : undefined,
    balanceLink: `${MARKETING_URL}/loyalty/${memberId}?token=${token}`,
  })

  send(customer.email, tpl).catch(err => console.error('[email] win-back error:', err))
}

import { adminSupabase } from '@/lib/studio-access'
import { passServiceFetch } from '@/lib/pass-service'
import { fireWebhook } from '@/lib/services/webhook-service'
import { sendReferralReward } from '@/lib/email/send'
import {
  DEFAULT_REWARDS_CONFIG,
  getReferralUnlockTier,
  migrateRewardsConfig,
  type RewardsConfig,
  type UpgradeTriggerConfig,
} from '@/types/database'
import {
  applyPermanentDeal,
  effectiveCashbackRate,
  loadMemberDeal,
  type MemberDeal,
} from '@/lib/services/member-deal-service'

/**
 * Referral activation: the referred friend's first transaction that meets
 * the studio's activation trigger flips the referral from pending to
 * activated, credits the referrer's cashback bonus, and opens the commission
 * window. Used by processTransaction and by the one-off backfill script
 * (scripts/activate-pending-referrals.ts).
 */

type QueueWebhook = (...args: Parameters<typeof fireWebhook>) => void

export type ReferralFriend = {
  referral_count: number | null
  created_at: string
}

/**
 * Does this transaction by the friend meet the activation trigger?
 *
 * Only asked while the referral is pending, and activateReferral flips the
 * status with a guarded write. So "first" means the first transaction while
 * pending that meets the rule; it happens once. has_purchased cannot serve
 * as the "first" test: a deposit sets it, so a friend who pays a deposit and
 * then the full price would never meet first_full_payment.
 *
 *   first_purchase      any transaction, deposits included
 *   first_full_payment  any transaction that is not a deposit
 *   total_spend         spend after this transaction >= threshold (deposits count, as in total_real_spend)
 *   referral_count      the friend's own referral_count >= threshold
 *   days_member         days since the friend joined >= threshold
 */
export function referralTriggerMet(
  trigger: UpgradeTriggerConfig,
  friend: ReferralFriend,
  transaction: { newSpendTotal: number; isDeposit?: boolean; now?: Date },
): boolean {
  const threshold = trigger.threshold ?? 0
  switch (trigger.type) {
    case 'first_purchase':
      return true
    case 'first_full_payment':
      return !transaction.isDeposit
    case 'total_spend':
      return transaction.newSpendTotal >= threshold
    case 'referral_count':
      return (friend.referral_count ?? 0) >= threshold
    case 'days_member': {
      const now = transaction.now ?? new Date()
      const days = Math.floor((now.getTime() - new Date(friend.created_at).getTime()) / 86400000)
      return days >= threshold
    }
    default:
      return false
  }
}

/**
 * The referrer's new permanent rate: + the per-referral bonus, up to the cap.
 * A bonus never lowers a rate that is already above the cap.
 */
export function referrerBonusRate(referrer: MemberDeal, config: RewardsConfig): number {
  const currentRate = referrer.permanentRate || getReferralUnlockTier(config)?.cashback_rate || config.tiers[0].cashback_rate
  return Math.max(
    currentRate,
    Math.min(currentRate + config.referrals.referrer_cashback_bonus_per_ref, config.referrals.referrer_cashback_cap),
  )
}

type ActivateReferralInput = {
  referral: { id: string; referrer_customer_id: string; referred_customer_id: string }
  studioId: string
  config: RewardsConfig
  results: string[]
  queueWebhook: QueueWebhook
  now?: Date
}

/**
 * Flip one referral to activated and credit the referrer. The status write
 * is guarded on status='pending' and returns the row, so of two concurrent
 * or retried transactions only one activates and pays. Returns whether this
 * call activated it.
 */
export async function activateReferral(input: ActivateReferralInput): Promise<boolean> {
  const { referral, studioId, config, results, queueWebhook } = input
  const now = input.now ?? new Date()
  const durationDays = config.referrals.referrer_commission_duration_days
  // 0 = unlimited (the rewards settings and the referrals migration route read it so).
  const commissionExpiresAt = durationDays > 0
    ? new Date(now.getTime() + durationDays * 86400000).toISOString()
    : null

  const { data: claimed, error } = await adminSupabase
    .from('referrals')
    .update({ status: 'activated', activated_at: now.toISOString(), commission_expires_at: commissionExpiresAt })
    .eq('id', referral.id)
    .eq('studio_id', studioId)
    .eq('status', 'pending')
    .select('id')
  if (error) {
    console.error('[referrals] activation failed:', { referralId: referral.id, message: error.message })
    results.push(`Referral activation failed: ${error.message}`)
    return false
  }
  if (!claimed || claimed.length === 0) return false // another transaction activated it first

  await creditReferrer(referral.referrer_customer_id, referral.referred_customer_id, studioId, config, results, queueWebhook)
  return true
}

/**
 * Referral bonus: raise the referrer's permanent rate (referrerBonusRate).
 * During a promotion the bonus lands in its fallback, and the row shows the
 * best deal. A failure is reported in `results`, not thrown: the friend's
 * purchase has already been recorded.
 */
async function creditReferrer(
  referrerId: string,
  referredId: string,
  studioId: string,
  config: RewardsConfig,
  results: string[],
  queueWebhook: QueueWebhook,
) {
  try {
    const referrer = await loadMemberDeal(studioId, referrerId, config.tiers)
    if (!referrer) return

    const newCount = (referrer.customer.referral_count || 0) + 1
    const after = await applyPermanentDeal({
      studioId,
      customerId: referrerId,
      cashbackRate: referrerBonusRate(referrer, config),
      source: 'referral',
      config,
      current: referrer,
      customerFields: { referral_count: newCount },
      tierChangeEvent: 'never',
    })

    results.push(`Referral activated. Referrer now at ${after.effective_cashback_rate}% cashback`)

    queueWebhook(studioId, 'referral.activated', referredId, {
      referrer_customer_id: referrerId,
      referrer_new_cashback_rate: after.effective_cashback_rate,
      referrer_referral_count: newCount,
    })

    // Send referral reward email to the referrer (fire-and-forget)
    const { data: referredCustomer } = await adminSupabase
      .from('customers')
      .select('name')
      .eq('id', referredId)
      .single()

    sendReferralReward(
      referrerId,
      studioId,
      referredCustomer?.name ?? 'A friend',
      config.referrals.referrer_cashback_bonus_per_ref,
    )

    void passServiceFetch(`/api/push/customer/${referrerId}`, { method: 'POST' }).catch(() => {})
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[referrals] referral bonus failed:', { referrerId, studioId, message })
    results.push(`Referral activated but the referrer's rate update failed: ${message}`)
  }
}

// ─── Backfill: referrals left pending by the activation bug ──────────────────

export type PendingReferralVerdict =
  | 'qualifies'
  | 'no_purchase_yet'
  | 'trigger_not_met'
  | 'needs_manual_check'
  | 'program_disabled'
  | 'referrer_missing'

export type PendingReferralPlan = {
  referral_id: string
  studio_id: string
  studio_name: string
  created_at: string
  trigger: string
  friend: { id: string; name: string; has_purchased: boolean; total_real_spend: number }
  referrer: {
    id: string
    name: string
    permanent_rate: number
    new_permanent_rate: number
    effective_rate_after: number
    promotion: string | null
  } | null
  verdict: PendingReferralVerdict
}

type PendingRow = {
  id: string
  studio_id: string
  created_at: string
  referrer_customer_id: string
  referred_customer_id: string
}

/**
 * Read-only. For each pending referral: would the friend's transactions so
 * far have activated it under the fixed rule, and what would the referrer get.
 * Judged on the friend's state now: activation needs at least one transaction
 * (has_purchased). first_full_payment is never auto-qualified: has_purchased
 * cannot tell a deposit from a full payment.
 */
export async function planPendingReferralActivations(options: { studioId?: string; now?: Date } = {}): Promise<PendingReferralPlan[]> {
  let query = adminSupabase
    .from('referrals')
    .select('id, studio_id, created_at, referrer_customer_id, referred_customer_id')
    .eq('status', 'pending')
    .order('created_at')
  if (options.studioId) query = query.eq('studio_id', options.studioId)
  const { data: pending, error } = await query
  if (error) throw new Error(`Failed to load pending referrals: ${error.message}`)

  const configs = new Map<string, { name: string; config: RewardsConfig }>()
  const plans: PendingReferralPlan[] = []

  for (const referral of (pending ?? []) as PendingRow[]) {
    if (!configs.has(referral.studio_id)) {
      const { data: studio, error: studioError } = await adminSupabase
        .from('studios')
        .select('name, settings')
        .eq('id', referral.studio_id)
        .single()
      if (studioError) throw new Error(`Failed to load studio ${referral.studio_id}: ${studioError.message}`)
      const settings = studio?.settings as Record<string, unknown> | null
      configs.set(referral.studio_id, {
        name: (studio?.name as string) ?? referral.studio_id,
        config: settings?.rewards_config ? migrateRewardsConfig(settings.rewards_config) : DEFAULT_REWARDS_CONFIG,
      })
    }
    const { name: studioName, config } = configs.get(referral.studio_id)!

    const { data: friend, error: friendError } = await adminSupabase
      .from('customers')
      .select('id, name, has_purchased, total_real_spend, referral_count, created_at')
      .eq('id', referral.referred_customer_id)
      .eq('studio_id', referral.studio_id)
      .single()
    if (friendError || !friend) throw new Error(`Failed to load friend ${referral.referred_customer_id}: ${friendError?.message}`)

    const referrerDeal = await loadMemberDeal(referral.studio_id, referral.referrer_customer_id, config.tiers)
    const { data: referrerRow } = await adminSupabase
      .from('customers')
      .select('name')
      .eq('id', referral.referrer_customer_id)
      .maybeSingle()

    const trigger = config.referrals.activation_trigger
    let verdict: PendingReferralVerdict
    if (!config.referrals.enabled) verdict = 'program_disabled'
    else if (!referrerDeal) verdict = 'referrer_missing'
    else if (!friend.has_purchased) verdict = 'no_purchase_yet'
    else if (trigger.type === 'first_full_payment') verdict = 'needs_manual_check'
    else if (referralTriggerMet(trigger, friend, { newSpendTotal: Number(friend.total_real_spend ?? 0), now: options.now })) verdict = 'qualifies'
    else verdict = 'trigger_not_met'

    let referrer: PendingReferralPlan['referrer'] = null
    if (referrerDeal) {
      const newRate = referrerBonusRate(referrerDeal, config)
      referrer = {
        id: referral.referrer_customer_id,
        name: (referrerRow?.name as string) ?? referral.referrer_customer_id,
        permanent_rate: referrerDeal.permanentRate,
        new_permanent_rate: newRate,
        effective_rate_after: effectiveCashbackRate(referrerDeal.promo, newRate, config.tiers),
        promotion: referrerDeal.promo?.type ?? null,
      }
    }

    plans.push({
      referral_id: referral.id,
      studio_id: referral.studio_id,
      studio_name: studioName,
      created_at: referral.created_at,
      trigger: trigger.threshold != null ? `${trigger.type} ${trigger.threshold}` : trigger.type,
      friend: {
        id: friend.id as string,
        name: friend.name as string,
        has_purchased: Boolean(friend.has_purchased),
        total_real_spend: Number(friend.total_real_spend ?? 0),
      },
      referrer,
      verdict,
    })
  }

  return plans
}

/**
 * Activate the plans marked 'qualifies', through the same path as a purchase
 * (activateReferral). Side effects per activation: the referral row, the
 * referrer's rate + referral_count, a referral.activated webhook, the
 * referral reward email, a wallet-pass push. No commission is paid for past
 * purchases; the window opens now.
 */
export async function applyPendingReferralActivations(
  plans: PendingReferralPlan[],
): Promise<Array<{ referral_id: string; activated: boolean; results: string[] }>> {
  const out: Array<{ referral_id: string; activated: boolean; results: string[] }> = []
  for (const plan of plans.filter((p) => p.verdict === 'qualifies')) {
    const { data: studio } = await adminSupabase.from('studios').select('settings').eq('id', plan.studio_id).single()
    const settings = studio?.settings as Record<string, unknown> | null
    const config = settings?.rewards_config ? migrateRewardsConfig(settings.rewards_config) : DEFAULT_REWARDS_CONFIG

    const results: string[] = []
    const webhooks: Promise<void>[] = []
    const activated = await activateReferral({
      referral: { id: plan.referral_id, referrer_customer_id: plan.referrer!.id, referred_customer_id: plan.friend.id },
      studioId: plan.studio_id,
      config,
      results,
      queueWebhook: (...args) => { webhooks.push(fireWebhook(...args)) },
    })
    await Promise.allSettled(webhooks)
    out.push({ referral_id: plan.referral_id, activated, results })
  }
  return out
}

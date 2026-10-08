// Gift-first referral copy: the numbers behind the friend's landing page
// (/refer/[memberId]) and the gift block on the member page
// (/loyalty/[memberId]). Pure functions only, so they are unit tested.

import type { GiftTranslations, RewardMoment } from '@/lib/i18n/gift'
import type { RewardsConfig, TierConfig } from '@/types/database'

/**
 * The thank-you a giver gets from StreamInk when a friend gets tattooed, at a
 * switched studio (rewards_config.pilot_switched_at set). StreamInk pays it,
 * not Loyalink, so Loyalink's config does not hold it.
 *
 * Mirror of StreamInk's THANK_YOU_AMOUNT_BY_CURRENCY. Change both together.
 */
export const THANK_YOU_AMOUNT_BY_CURRENCY: Readonly<Record<string, number>> = {
  EUR: 25,
  SEK: 250,
  DKK: 200,
}

/** The thank-you amount for a currency code (any case), or null when unknown. */
export function thankYouAmount(currency: string | null | undefined): number | null {
  if (!currency) return null
  return THANK_YOU_AMOUNT_BY_CURRENCY[currency.trim().toUpperCase()] ?? null
}

/** What the friend gets: the welcome bonus (credited at sign-up) and the friend's cashback rate. */
export type FriendGift = {
  /** friend_welcome_bonus; 0 when none is set. */
  bonus: number
  /** The rate createMember gives a referred friend: referrals.friend_cashback_rate. */
  rate: number
}

export function friendGift(config: RewardsConfig): FriendGift {
  const bonus = Number(config.referrals.friend_welcome_bonus)
  return {
    bonus: Number.isFinite(bonus) && bonus > 0 ? bonus : 0,
    rate: Number(config.referrals.friend_cashback_rate) || 0,
  }
}

/** The friend page headline: "{bonus} on your card" with a bonus, "{rate}% cashback at {studio}" without. */
export function giftHeadlineVariant(bonus: number | null | undefined): 'bonus' | 'rate' {
  return Number(bonus) > 0 ? 'bonus' : 'rate'
}

/** What the giver gets when the friend gets tattooed, phrased as a thank-you. */
export type GiverThankYou =
  | { kind: 'switched'; amount: number }
  | {
      kind: 'loyalink'
      cashbackBoost: number
      /** days: referrer_commission_duration_days, 0 = no end. */
      commission: { type: 'percentage' | 'fixed'; value: number; days: number } | null
    }
  | null

export function giverThankYou(config: RewardsConfig, currency: string | null | undefined): GiverThankYou {
  if (config.pilot_switched_at) {
    const amount = thankYouAmount(currency)
    return amount == null ? null : { kind: 'switched', amount }
  }
  const boost = Number(config.referrals.referrer_cashback_bonus_per_ref) || 0
  const commissionValue = Number(config.referrals.referrer_commission_rate) || 0
  const commission = commissionValue > 0
    ? {
        type: config.referrals.referrer_commission_type === 'fixed' ? 'fixed' as const : 'percentage' as const,
        value: commissionValue,
        days: Math.max(0, Math.floor(Number(config.referrals.referrer_commission_duration_days) || 0)),
      }
    : null
  if (boost <= 0 && !commission) return null
  return { kind: 'loyalink', cashbackBoost: Math.max(0, boost), commission }
}

/**
 * When the giver's reward lands, from the studio's REAL activation trigger
 * (not from "is switched"): first_purchase activates on any transaction, the
 * deposit included, so 'deposit' ("when they pay their deposit", "friends who
 * book"). Every other trigger (first_full_payment at Ink Nation, and at Nick
 * until scripts/activation-trigger-to-deposit.ts runs) is 'tattoo' ("when
 * they get tattooed", "tattooed friends").
 */
export function rewardMoment(config: Pick<RewardsConfig, 'referrals'>): RewardMoment {
  return config.referrals.activation_trigger?.type === 'first_purchase' ? 'deposit' : 'tattoo'
}

/**
 * The one line under the gift block headline: what the friend gets, then the
 * giver's thank-you (left out when there is none). formatMoney formats an
 * amount in the member's currency.
 */
export function giftOfferLine(
  g: GiftTranslations,
  gift: FriendGift,
  thanks: GiverThankYou,
  formatMoney: (amount: number) => string,
  moment: RewardMoment,
): string {
  const parts = [gift.bonus > 0 ? g.friendGetsBonus(formatMoney(gift.bonus), gift.rate) : g.friendGetsRate(gift.rate)]
  if (thanks?.kind === 'switched') {
    parts.push(g.youGetThankYou(formatMoney(thanks.amount), moment))
  } else if (thanks?.kind === 'loyalink') {
    if (thanks.cashbackBoost > 0) parts.push(g.youGetBoost(thanks.cashbackBoost, moment))
    if (thanks.commission) {
      parts.push(
        thanks.commission.type === 'fixed'
          ? g.youGetCommissionFixed(formatMoney(thanks.commission.value), thanks.commission.days)
          : g.youGetCommissionPct(thanks.commission.value, thanks.commission.days),
      )
    }
  }
  return parts.join(' ')
}

/**
 * The tier a giver reaches by friends who got tattooed: the tier with slug
 * inner_circle and a referral_count trigger. Switched studios reuse their old
 * tier slugs (pilot-switch-service), so when no tier has that slug the first
 * tier with a referral_count trigger counts.
 */
export function referralGoalTier(config: RewardsConfig): TierConfig | null {
  const byCount = config.tiers.filter(
    (t) => t.upgrade_trigger?.type === 'referral_count' && Number(t.upgrade_trigger.threshold ?? 0) > 0,
  )
  return byCount.find((t) => t.slug === 'inner_circle') ?? byCount[0] ?? null
}

export type ReferralGoalProgress =
  | { kind: 'none' }
  | { kind: 'reached'; tierName: string; rate: number }
  | { kind: 'progress'; tierName: string; rate: number; threshold: number; activated: number; remaining: number }

/**
 * "Road to 15% cashback: 1 of 3". activated = referrals with status
 * 'activated' (the friend got tattooed). A member already on the goal tier,
 * or above it, has reached it.
 */
export function referralGoalProgress(
  config: RewardsConfig,
  loyaltyStage: string | null | undefined,
  activated: number,
): ReferralGoalProgress {
  const tier = referralGoalTier(config)
  if (!tier) return { kind: 'none' }
  const threshold = Math.floor(Number(tier.upgrade_trigger?.threshold ?? 0))
  const rate = Number(tier.cashback_rate)
  const goalIdx = config.tiers.findIndex((t) => t.slug === tier.slug)
  const memberIdx = config.tiers.findIndex((t) => t.slug === loyaltyStage)
  if (memberIdx >= 0 && memberIdx >= goalIdx) return { kind: 'reached', tierName: tier.name, rate }
  const done = Math.max(0, Math.min(Math.floor(Number(activated) || 0), threshold))
  return { kind: 'progress', tierName: tier.name, rate, threshold, activated: done, remaining: threshold - done }
}

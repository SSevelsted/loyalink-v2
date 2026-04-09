import type { RewardsConfig } from '@/types/database'

export type ReferralDiff = {
  friendRateChanged: { oldRate: number; newRate: number } | null
  commissionDurationChanged: { oldDays: number; newDays: number } | null
  requiresMigration: boolean
}

export function computeReferralDiff(
  oldConfig: RewardsConfig,
  newConfig: RewardsConfig
): ReferralDiff {
  const oldRef = oldConfig.referrals
  const newRef = newConfig.referrals

  // Only check if referrals are enabled in both
  if (!oldRef?.enabled || !newRef?.enabled) {
    return { friendRateChanged: null, commissionDurationChanged: null, requiresMigration: false }
  }

  const friendRateChanged =
    oldRef.friend_cashback_rate !== newRef.friend_cashback_rate
      ? { oldRate: oldRef.friend_cashback_rate, newRate: newRef.friend_cashback_rate }
      : null

  const commissionDurationChanged =
    oldRef.referrer_commission_duration_days !== newRef.referrer_commission_duration_days
      ? { oldDays: oldRef.referrer_commission_duration_days, newDays: newRef.referrer_commission_duration_days }
      : null

  return {
    friendRateChanged,
    commissionDurationChanged,
    requiresMigration: friendRateChanged !== null || commissionDurationChanged !== null,
  }
}

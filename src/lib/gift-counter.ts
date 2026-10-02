// "5 gifts to give": a member gives gifts (a friend's card) in rounds of 5.
//
// The count is derived, never stored: gifts given = the member's referral
// rows as referrer. Raffle/prize friends never get a referral row, so they
// never count. After the 5th gift a new round of 5 starts, so gifts_ready is
// never 0.

import type { RewardsConfig } from '@/types/database'

export const GIFTS_PER_ROUND = 5

export type GiftCounter = { gifts_given_total: number; gifts_ready: number }

export function giftCounterFromTotal(total: number): GiftCounter {
  const given = Math.max(0, Math.floor(Number(total) || 0))
  return { gifts_given_total: given, gifts_ready: GIFTS_PER_ROUND - (given % GIFTS_PER_ROUND) }
}

/** Per-studio switch rewards_config.referrals.gift_counter_enabled (default off). */
export function giftCounterEnabled(config: RewardsConfig | null | undefined): boolean {
  return config?.referrals?.gift_counter_enabled === true
}

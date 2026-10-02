import { adminSupabase } from '@/lib/studio-access'
import { giftCounterEnabled, giftCounterFromTotal, type GiftCounter } from '@/lib/gift-counter'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig, type RewardsConfig } from '@/types/database'

const PAGE = 1000

export async function loadStudioRewardsConfig(studioId: string): Promise<RewardsConfig> {
  const { data: studio } = await adminSupabase.from('studios').select('settings').eq('id', studioId).maybeSingle()
  const settings = studio?.settings as Record<string, unknown> | null
  return settings?.rewards_config ? migrateRewardsConfig(settings.rewards_config) : DEFAULT_REWARDS_CONFIG
}

/**
 * Gift counters for these members, or null per member when the studio has the
 * switch off. Counts every referral row where the member is the referrer
 * (pending, activated or expired). Pages past PostgREST's 1000-row cap.
 */
export async function loadGiftCounters(
  studioId: string,
  customerIds: string[],
  config?: RewardsConfig,
): Promise<Map<string, GiftCounter | null>> {
  const result = new Map<string, GiftCounter | null>()
  if (customerIds.length === 0) return result
  const rewardsConfig = config ?? await loadStudioRewardsConfig(studioId)
  if (!giftCounterEnabled(rewardsConfig)) {
    for (const id of customerIds) result.set(id, null)
    return result
  }

  const totals = new Map<string, number>(customerIds.map((id) => [id, 0]))
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await adminSupabase
      .from('referrals')
      .select('id, referrer_customer_id')
      .eq('studio_id', studioId)
      .in('referrer_customer_id', customerIds)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`gift counter: ${error.message}`)
    for (const row of data ?? []) {
      const id = row.referrer_customer_id as string
      totals.set(id, (totals.get(id) ?? 0) + 1)
    }
    if (!data || data.length < PAGE) break
  }
  for (const [id, total] of totals) result.set(id, giftCounterFromTotal(total))
  return result
}

/** The two additive API fields: numbers when the switch is on, null when off. */
export function giftFields(counter: GiftCounter | null | undefined) {
  return {
    gifts_given_total: counter?.gifts_given_total ?? null,
    gifts_ready: counter?.gifts_ready ?? null,
  }
}

import { adminSupabase } from '@/lib/studio-access'
import {
  DEFAULT_REWARDS_CONFIG,
  MANUAL_ONLY_SPEND_THRESHOLD,
  migrateRewardsConfig,
  syncReferralFriendRate,
  type PilotSwitchMode,
  type RewardsConfig,
  type TierConfig,
} from '@/types/database'
import {
  applyPermanentDeal,
  DEAL_PROMOTION_COLUMNS,
  dealRow,
  effectiveCashbackRate,
  permanentDeal,
  rewriteTierMembers,
  type DealPromotion,
} from '@/lib/services/member-deal-service'

/**
 * Switch day: move one studio to the StreamInk pilot rewards (owner decisions
 * 2026-10-01). Used by scripts/switch-day.ts.
 *
 *   tiers      base 5% -> after the tattoo 10% (first full payment) -> Inner Circle 15%
 *              at 3 activated referrals, i.e. 3 friends who paid at the counter
 *              (owner decision 2026-10-06; Loyalink upgrades the giver at the
 *              3rd friend's payment, see referral-service referralUpgradeTier)
 *   friend     joins on the 10% tier + a welcome bonus Loyalink credits itself
 *   giver      no Loyalink bonus and no commission: the platform pays the giver
 *              (EUR 25 / 250 kr per tattooed friend)
 *   referral   activates on the friend's first full payment (not a deposit)
 *
 * Existing members keep exactly what they have. The switch only replaces the
 * rewards config: rows and promotion fallbacks keep their explicit rates. Two
 * cases would still move a member and are handled before the config changes:
 *   - a row with no rate reads its tier's rate: it is pinned to today's rate
 *     (applyPermanentDeal, no event, no pass push)
 *   - a tier_override pays its tier's rate: a rate change on that tier is a
 *     blocker, and the switch refuses to run
 *
 * The tier slugs are reused (tiers[0..2] of the current config), so slugs
 * StreamInk has stored keep pointing at the same rung.
 */

export const PILOT_RATES = { base: 5, after_tattoo: 10, giver: 15 } as const

/** Default friend welcome bonus per studio currency (Loyalink credits it on a referral sign-up). */
export const DEFAULT_WELCOME_BONUS: Record<string, number> = { EUR: 25, SEK: 250 }

/** 2: Inner Circle at 3 activated referrals and 15% in both modes (was manual only). */
export const PILOT_SWITCH_VERSION = 2

/**
 * full           new studios: pilot tiers + the gift/referral rules
 * referral_only  current studios: the gift/referral rules, and the giver tier
 *                (tiers[2]) becomes Inner Circle: 15% at 3 activated
 *                referrals. The other tier rates, the friend tier and every
 *                member's deal stay as they are.
 */
export type { PilotSwitchMode }

/** Friends who must have paid at the counter (activated referrals) to reach Inner Circle. */
export const INNER_CIRCLE_FRIENDS = 3

/** tiers[2] trigger at switched studios: Loyalink upgrades at the 3rd activated referral. */
export const INNER_CIRCLE_TRIGGER = { type: 'referral_count', threshold: INNER_CIRCLE_FRIENDS } as const

/** "Never automatic": the spend threshold non-switched studios' Inner Circle still uses. */
export const PILOT_MANUAL_ONLY_TRIGGER = { type: 'total_spend', threshold: MANUAL_ONLY_SPEND_THRESHOLD } as const

/** tiers[2] (the giver tier) as a switched studio runs it: 15% at 3 activated referrals. */
function innerCircleTier(tier: TierConfig): TierConfig {
  return { ...tier, cashback_rate: PILOT_RATES.giver, upgrade_trigger: { ...INNER_CIRCLE_TRIGGER } }
}

export class PilotSwitchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PilotSwitchError'
  }
}

// ─── Target config ───────────────────────────────────────────────────────────

export type PilotTierSlugs = { base: string; after_tattoo: string; giver: string }

export function pilotTierSlugs(current: RewardsConfig): PilotTierSlugs {
  const slugs = {
    base: current.tiers[0]?.slug ?? 'base',
    after_tattoo: current.tiers[1]?.slug ?? 'loyalty_club',
    giver: current.tiers[2]?.slug ?? 'inner_circle',
  }
  if (new Set(Object.values(slugs)).size !== 3) {
    throw new PilotSwitchError(`Tier slugs collide: ${JSON.stringify(slugs)}`)
  }
  return slugs
}

/**
 * The pilot rewards config, built on the studio's current one. Tiers 0-2 keep
 * their slug and name and take the pilot rate and trigger. Any tier after
 * them stays as it is, so a member on it is not orphaned.
 */
export function pilotTargetConfig(
  current: RewardsConfig,
  opts: { welcomeBonus: number; switchedAt: string; mode?: PilotSwitchMode },
): RewardsConfig {
  if (!Number.isFinite(opts.welcomeBonus) || opts.welcomeBonus < 0) {
    throw new PilotSwitchError('welcome bonus must be a non-negative number')
  }
  if (opts.mode === 'referral_only') {
    // The friend keeps the studio's friend tier: in this config a friend's
    // rate is always its tier's rate (syncReferralFriendRate), so "at least
    // 10%" without a tier change is not possible (the platform adds a boost).
    // Rates stay, except the giver tier (tiers[2]): Inner Circle, 15% at 3
    // activated referrals, as in the full setup.
    return {
      ...current,
      tiers: current.tiers.map((t, i) => (i === 2 ? innerCircleTier(t) : t)),
      referrals: {
        ...current.referrals,
        enabled: true,
        friend_welcome_bonus: opts.welcomeBonus,
        referrer_cashback_bonus_per_ref: 0,
        referrer_commission_rate: 0,
        referrer_commission_type: 'percentage',
        activation_trigger: { type: 'first_full_payment' },
      },
      pilot_switched_at: opts.switchedAt,
      pilot_switch_mode: 'referral_only',
    }
  }
  const slugs = pilotTierSlugs(current)
  const named = (i: number, fallback: string) => current.tiers[i]?.name ?? fallback

  const tiers: TierConfig[] = [
    { slug: slugs.base, name: named(0, 'Base'), cashback_rate: PILOT_RATES.base, unlocks_referrals: true },
    {
      slug: slugs.after_tattoo,
      name: named(1, 'Loyalty Club'),
      cashback_rate: PILOT_RATES.after_tattoo,
      upgrade_trigger: { type: 'first_full_payment' },
      unlocks_referrals: current.tiers[1]?.unlocks_referrals ?? false,
    },
    innerCircleTier({
      slug: slugs.giver,
      name: named(2, 'Inner Circle'),
      cashback_rate: PILOT_RATES.giver,
      // Loyalink upgrades the giver at the 3rd activated referral (the
      // friend's payment). The giver's money stays with the platform.
      unlocks_referrals: current.tiers[2]?.unlocks_referrals ?? false,
    }),
    ...current.tiers.slice(3),
  ]

  return syncReferralFriendRate({
    ...current,
    enabled: true,
    tiers,
    referrals: {
      ...current.referrals,
      enabled: true,
      friend_tier_slug: slugs.after_tattoo,
      friend_cashback_rate: PILOT_RATES.after_tattoo,
      friend_welcome_bonus: opts.welcomeBonus,
      referrer_cashback_bonus_per_ref: 0,
      referrer_commission_rate: 0,
      referrer_commission_type: 'percentage',
      activation_trigger: { type: 'first_full_payment' },
    },
    pilot_switched_at: opts.switchedAt,
    pilot_switch_mode: 'full',
  })
}

/** Every leaf that differs between two configs, as dotted paths. */
export function diffConfig(before: unknown, after: unknown, path = ''): Array<{ path: string; from: unknown; to: unknown }> {
  const isObj = (v: unknown): v is Record<string, unknown> => v != null && typeof v === 'object'
  if (isObj(before) && isObj(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    return keys.flatMap((k) => diffConfig(before[k], after[k], path ? `${path}.${k}` : k))
  }
  return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ path, from: before, to: after }]
}

// ─── Read ────────────────────────────────────────────────────────────────────

export type PilotSwitchMember = {
  id: string
  loyalty_stage: string
  cashback_rate: number | string | null
  has_purchased: boolean | null
  referral_count: number | null
  currency: string | null
}

export type PilotSwitchInput = {
  studio: { id: string; name: string; is_agency: boolean | null; settings: Record<string, unknown> | null }
  members: PilotSwitchMember[]
  promotions: Array<DealPromotion & { customer_id: string }>
  pendingReferrals: Array<{ id: string; created_at: string }>
}

const PAGE = 1000

async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new PilotSwitchError(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

/** Read-only. NULL when the studio does not exist in Loyalink. */
export async function loadPilotSwitchInput(studioId: string): Promise<PilotSwitchInput | null> {
  const { data: studio, error } = await adminSupabase
    .from('studios')
    .select('id, name, is_agency, settings')
    .eq('id', studioId)
    .maybeSingle()
  if (error) throw new PilotSwitchError(`Failed to load studio: ${error.message}`)
  if (!studio) return null

  const [members, promotions, pendingReferrals] = await Promise.all([
    readAll<PilotSwitchMember>((from, to) => adminSupabase
      .from('customers')
      .select('id, loyalty_stage, cashback_rate, has_purchased, referral_count, currency')
      .eq('studio_id', studioId)
      .order('id')
      .range(from, to)),
    readAll<DealPromotion & { customer_id: string }>((from, to) => adminSupabase
      .from('member_promotions')
      .select(`${DEAL_PROMOTION_COLUMNS}, customer_id`)
      .eq('studio_id', studioId)
      .eq('status', 'active')
      .order('id')
      .range(from, to)),
    readAll<{ id: string; created_at: string }>((from, to) => adminSupabase
      .from('referrals')
      .select('id, created_at')
      .eq('studio_id', studioId)
      .eq('status', 'pending')
      .order('id')
      .range(from, to)),
  ])

  return { studio: studio as PilotSwitchInput['studio'], members, promotions, pendingReferrals }
}

// ─── Plan (pure) ─────────────────────────────────────────────────────────────

export type PilotSwitchPlan = {
  studio: { id: string; name: string; currency: string; is_agency: boolean }
  /** settings.rewards_config as stored (the apply step checks it is unchanged). */
  storedConfig: unknown
  current: RewardsConfig
  target: RewardsConfig
  slugs: PilotTierSlugs
  mode: PilotSwitchMode
  welcomeBonus: number
  diff: Array<{ path: string; from: unknown; to: unknown }>
  alreadySwitchedAt: string | null
  tiersNow: Array<{ tier: string; in_config: boolean; members: number; with_promotion: number; rates: string }>
  members: {
    total: number
    /** Members whose deal the new config leaves exactly as it is. */
    keep: number
    /** Rows with no rate: pinned to today's rate before the config changes. */
    pin: Array<{ customer_id: string; tier: string; rate: number }>
    /** Members whose deal the switch would change and that cannot be pinned. Each is a blocker. */
    change: Array<{ customer_id: string; reason: string; before: number; after: number }>
  }
  promotions: Array<{ type: string; offers: string; fallback: string; members: number; pays_before: number; pays_after: number }>
  /** Members whose next upgrade lands on a different rate after the switch. */
  upgradePath: Array<{ from_tier: string; before: string; after: string; members: number; not_purchased: number }>
  /** Members whose next upgrade would set a rate below their own rate today. */
  upgradeLowers: number
  pendingReferrals: { count: number; trigger_before: string; trigger_after: string }
  /** Members whose card currency is not the studio's (the bonus is one number in the friend's currency). */
  otherCurrencyMembers: Record<string, number>
  blockers: string[]
}

function tierLabel(tiers: RewardsConfig['tiers'], idx: number): string {
  const t = tiers[idx]
  if (!t) return 'none (top tier)'
  const trig = t.upgrade_trigger
    ? `${t.upgrade_trigger.type}${t.upgrade_trigger.threshold != null ? ` ${t.upgrade_trigger.threshold}` : ''}`
    : 'base'
  return `${t.slug} ${t.cashback_rate}% (${trig})`
}

function deal(row: PilotSwitchMember, promo: DealPromotion | null, tiers: RewardsConfig['tiers']) {
  const permanent = permanentDeal({ loyalty_stage: row.loyalty_stage, cashback_rate: row.cashback_rate }, promo, tiers)
  const effective = dealRow(promo, permanent.tier, permanent.rate, tiers, row.loyalty_stage)
  return { permanent, effective }
}

export function planPilotSwitch(
  input: PilotSwitchInput,
  opts: { welcomeBonus?: number; currency?: string; switchedAt?: string; mode?: PilotSwitchMode } = {},
): PilotSwitchPlan {
  const settings = input.studio.settings ?? {}
  const storedConfig = settings.rewards_config ?? null
  const current = storedConfig ? migrateRewardsConfig(storedConfig) : DEFAULT_REWARDS_CONFIG
  const studioCurrency = String(settings.currency ?? '').toUpperCase()
  const blockers: string[] = []

  if (opts.currency && opts.currency.toUpperCase() !== studioCurrency) {
    blockers.push(`--currency ${opts.currency.toUpperCase()} does not match the studio currency ${studioCurrency || '(none)'}`)
  }
  const welcomeBonus = opts.welcomeBonus ?? DEFAULT_WELCOME_BONUS[studioCurrency]
  if (welcomeBonus == null) {
    blockers.push(`No default welcome bonus for currency ${studioCurrency || '(none)'}: pass --welcome-bonus`)
  }

  const mode: PilotSwitchMode = opts.mode ?? 'full'
  const target = pilotTargetConfig(current, {
    mode,
    welcomeBonus: welcomeBonus ?? 0,
    switchedAt: opts.switchedAt ?? new Date().toISOString(),
  })
  const slugs = pilotTierSlugs(current)
  const alreadySwitchedAt = current.pilot_switched_at ?? null
  if (alreadySwitchedAt) blockers.push(`Already switched at ${alreadySwitchedAt} (to move a switched studio to the new Inner Circle rule, use --update-inner-circle)`)

  const promoBy = new Map(input.promotions.map((p) => [p.customer_id, p]))
  const configSlugs = new Set(current.tiers.map((t) => t.slug))

  // Tiers now.
  const tierGroups = new Map<string, { members: number; with_promotion: number; rates: Map<string, number> }>()
  for (const m of input.members) {
    const g = tierGroups.get(m.loyalty_stage) ?? { members: 0, with_promotion: 0, rates: new Map() }
    g.members += 1
    if (promoBy.has(m.id)) g.with_promotion += 1
    const rate = m.cashback_rate == null ? 'null' : String(Number(m.cashback_rate))
    g.rates.set(rate, (g.rates.get(rate) ?? 0) + 1)
    tierGroups.set(m.loyalty_stage, g)
  }
  const tiersNow = [...tierGroups.entries()]
    .sort((a, b) => b[1].members - a[1].members)
    .map(([tier, g]) => ({
      tier,
      in_config: configSlugs.has(tier),
      members: g.members,
      with_promotion: g.with_promotion,
      rates: [...g.rates.entries()].map(([r, n]) => `${r}%×${n}`).join(' '),
    }))

  // Per member: the deal before and after, and the next upgrade.
  let keep = 0
  const pin: PilotSwitchPlan['members']['pin'] = []
  const change: PilotSwitchPlan['members']['change'] = []
  const upgrade = new Map<string, PilotSwitchPlan['upgradePath'][number]>()
  let upgradeLowers = 0
  const otherCurrencyMembers: Record<string, number> = {}

  for (const m of input.members) {
    const promo = promoBy.get(m.id) ?? null
    const before = deal(m, promo, current.tiers)
    const after = deal(m, promo, target.tiers)
    const same = before.permanent.rate === after.permanent.rate
      && before.permanent.tier === after.permanent.tier
      && before.effective.cashback_rate === after.effective.cashback_rate
      && before.effective.loyalty_stage === after.effective.loyalty_stage
    if (same) keep += 1
    else if (!promo && m.cashback_rate == null) {
      pin.push({ customer_id: m.id, tier: before.permanent.tier, rate: before.permanent.rate })
    } else {
      change.push({
        customer_id: m.id,
        reason: promo ? `${promo.type} ${promo.tier_slug ?? promo.cashback_rate}` : `row rate ${m.cashback_rate}`,
        before: before.effective.cashback_rate,
        after: after.effective.cashback_rate,
      })
    }

    // Next upgrade, measured from the member's own tier (as processTransaction does).
    const idx = current.tiers.findIndex((t) => t.slug === before.permanent.tier)
    const next = Math.max(idx, 0) + 1
    const b = tierLabel(current.tiers, next)
    const a = tierLabel(target.tiers, next)
    if (b !== a) {
      const key = `${before.permanent.tier}|${b}|${a}`
      const g = upgrade.get(key) ?? { from_tier: before.permanent.tier, before: b, after: a, members: 0, not_purchased: 0 }
      g.members += 1
      if (!m.has_purchased) g.not_purchased += 1
      upgrade.set(key, g)
    }
    const nextRate = target.tiers[next]?.cashback_rate
    if (nextRate != null && nextRate < before.permanent.rate) upgradeLowers += 1

    const cur = (m.currency ?? '').toUpperCase()
    if (cur && cur !== studioCurrency) otherCurrencyMembers[cur] = (otherCurrencyMembers[cur] ?? 0) + 1
  }
  for (const c of change) {
    blockers.push(`Member ${c.customer_id} would move (${c.reason}): ${c.before}% -> ${c.after}%`)
  }

  // Active promotions, grouped.
  const promoGroups = new Map<string, PilotSwitchPlan['promotions'][number]>()
  for (const p of input.promotions) {
    const offers = p.type === 'cashback_boost' ? `${Number(p.cashback_rate)}%` : `tier ${p.tier_slug}`
    const fallback = `${p.original_tier_slug} ${Number(p.original_cashback_rate)}%`
    const paysBefore = effectiveCashbackRate(p, Number(p.original_cashback_rate), current.tiers)
    const paysAfter = effectiveCashbackRate(p, Number(p.original_cashback_rate), target.tiers)
    const key = `${p.type}|${offers}|${fallback}|${paysBefore}|${paysAfter}`
    const g = promoGroups.get(key) ?? { type: p.type, offers, fallback, members: 0, pays_before: paysBefore, pays_after: paysAfter }
    g.members += 1
    promoGroups.set(key, g)
  }

  const trig = (t: RewardsConfig['referrals']['activation_trigger']) =>
    `${t.type}${t.threshold != null ? ` ${t.threshold}` : ''}`

  return {
    studio: {
      id: input.studio.id,
      name: input.studio.name,
      currency: studioCurrency,
      is_agency: input.studio.is_agency === true,
    },
    storedConfig,
    current,
    target,
    slugs,
    mode,
    welcomeBonus: welcomeBonus ?? 0,
    diff: diffConfig(current, target).filter((d) => d.path !== 'pilot_switched_at' && d.path !== 'pilot_switch_mode'),
    alreadySwitchedAt,
    tiersNow,
    members: { total: input.members.length, keep, pin, change },
    promotions: [...promoGroups.values()].sort((a, b) => b.members - a.members),
    upgradePath: [...upgrade.values()].sort((a, b) => b.members - a.members),
    upgradeLowers,
    pendingReferrals: {
      count: input.pendingReferrals.length,
      trigger_before: trig(current.referrals.activation_trigger),
      trigger_after: trig(target.referrals.activation_trigger),
    },
    otherCurrencyMembers,
    blockers,
  }
}

/** The dry-run report, one line per entry. */
export function describePilotSwitchPlan(plan: PilotSwitchPlan): string[] {
  const out: string[] = []
  const json = (v: unknown) => JSON.stringify(v)
  out.push(`Studio: ${plan.studio.name} (${plan.studio.id}), currency ${plan.studio.currency}, agency ${plan.studio.is_agency}`)
  out.push(`Mode: ${plan.mode}${plan.mode === 'referral_only' ? ` (friend tier and member deals untouched; giver tier ${PILOT_RATES.giver}% at ${INNER_CIRCLE_FRIENDS} activated referrals)` : ''}`)
  out.push(plan.alreadySwitchedAt ? `Already switched at ${plan.alreadySwitchedAt}` : 'Not switched yet')
  out.push('')
  out.push('Current rewards_config:')
  out.push(JSON.stringify(plan.current, null, 2))
  out.push('')
  out.push('Target rewards_config:')
  out.push(JSON.stringify(plan.target, null, 2))
  out.push('')
  out.push(`Diff (${plan.diff.length} fields; pilot_switched_at + pilot_switch_mode are set on --apply):`)
  for (const d of plan.diff) out.push(`  ${d.path}: ${json(d.from)} -> ${json(d.to)}`)
  out.push('')
  out.push(`Tier slugs: base=${plan.slugs.base}, after tattoo=${plan.slugs.after_tattoo}, giver=${plan.slugs.giver}`)
  out.push(`Friend welcome bonus: ${plan.welcomeBonus} ${plan.studio.currency}`)
  out.push('')
  out.push(`Members now: ${plan.members.total}`)
  for (const t of plan.tiersNow) {
    out.push(`  ${t.tier}${t.in_config ? '' : ' (not a tier in the config)'}: ${t.members} members, ${t.with_promotion} with a promotion, row rates ${t.rates}`)
  }
  out.push(`Keep their deal exactly: ${plan.members.keep} of ${plan.members.total}`)
  out.push(`Pinned to today's rate (row had no rate): ${plan.members.pin.length}`)
  for (const p of plan.members.pin) out.push(`  ${p.customer_id} ${p.tier} ${p.rate}%`)
  out.push(`Would change (blockers): ${plan.members.change.length}`)
  out.push('')
  out.push(`Active promotions: ${plan.promotions.reduce((n, p) => n + p.members, 0)}`)
  for (const p of plan.promotions) {
    out.push(`  ${p.type} offers ${p.offers}, fallback ${p.fallback}: ${p.members} members, pays ${p.pays_before}% before, ${p.pays_after}% after`)
  }
  out.push('')
  out.push('Next upgrade that changes (applies to a member at their next qualifying purchase):')
  if (plan.upgradePath.length === 0) out.push('  none')
  for (const u of plan.upgradePath) {
    out.push(`  from ${u.from_tier}: ${u.before} -> ${u.after}: ${u.members} members (${u.not_purchased} not purchased yet)`)
  }
  out.push(`Next upgrade would set a rate below the member's own rate: ${plan.upgradeLowers}`)
  out.push('')
  out.push(`Pending referrals: ${plan.pendingReferrals.count} (trigger ${plan.pendingReferrals.trigger_before} -> ${plan.pendingReferrals.trigger_after})`)
  const other = Object.entries(plan.otherCurrencyMembers)
  out.push(`Members with another card currency: ${other.length ? other.map(([c, n]) => `${c}×${n}`).join(', ') : 'none'}`)
  out.push('')
  out.push(plan.blockers.length ? `BLOCKED (${plan.blockers.length}):` : 'No blockers.')
  for (const b of plan.blockers) out.push(`  ${b}`)
  return out
}

// ─── Apply ───────────────────────────────────────────────────────────────────

export type PilotSwitchRecord = {
  switched_at: string
  version: number
  mode: PilotSwitchMode
  tier_slugs: PilotTierSlugs
  /** Rates of tiers 0-2 in the saved config. */
  rates: { base: number; after_tattoo: number; giver: number }
  friend_welcome_bonus: number
  currency: string
  previous_rewards_config: unknown
}

/**
 * Write the switch. Refuses on any blocker, and when the stored config moved
 * since the plan was read. Pins rate-less rows first (no event, no pass
 * push), then saves the target config with settings.pilot_switch.
 */
export async function applyPilotSwitch(plan: PilotSwitchPlan): Promise<{ pinned: number; record: PilotSwitchRecord }> {
  if (plan.blockers.length > 0) {
    throw new PilotSwitchError(`Refusing to switch: ${plan.blockers.join('; ')}`)
  }
  const studioId = plan.studio.id

  for (const p of plan.members.pin) {
    await applyPermanentDeal({
      studioId,
      customerId: p.customer_id,
      cashbackRate: p.rate,
      source: 'pilot_switch',
      config: plan.current,
      tierChangeEvent: 'never',
    })
  }

  const { data: studio, error } = await adminSupabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()
  if (error || !studio) throw new PilotSwitchError(`Failed to reload studio settings: ${error?.message ?? 'not found'}`)
  const settings = (studio.settings as Record<string, unknown> | null) ?? {}
  if (JSON.stringify(settings.rewards_config ?? null) !== JSON.stringify(plan.storedConfig)) {
    throw new PilotSwitchError('The rewards config changed since the dry run. Run it again.')
  }

  const switchedAt = plan.target.pilot_switched_at ?? new Date().toISOString()
  const record: PilotSwitchRecord = {
    switched_at: switchedAt,
    version: PILOT_SWITCH_VERSION,
    mode: plan.mode,
    tier_slugs: plan.slugs,
    rates: {
      base: plan.target.tiers[0]?.cashback_rate ?? 0,
      after_tattoo: plan.target.tiers[1]?.cashback_rate ?? 0,
      giver: plan.target.tiers[2]?.cashback_rate ?? 0,
    },
    friend_welcome_bonus: plan.welcomeBonus,
    currency: plan.studio.currency,
    previous_rewards_config: plan.storedConfig,
  }

  const { error: saveError } = await adminSupabase
    .from('studios')
    .update({ settings: { ...settings, rewards_config: plan.target, pilot_switch: record } })
    .eq('id', studioId)
  if (saveError) throw new PilotSwitchError(`Failed to save rewards config: ${saveError.message}`)

  return { pinned: plan.members.pin.length, record }
}

// ─── Update Inner Circle on a switched studio ────────────────────────────────

/**
 * Studios switched before 2026-10-06 run Inner Circle (tiers[2]) as manual
 * only (total_spend 999999), and Ink Nation at 10%. This rewrites ONLY
 * tiers[2] to 15% at 3 activated referrals, keeps the giver bonus and the
 * commission at 0, and raises the permanent rate of members already on that
 * tier to 15% (promotion-aware: rewriteTierMembers). Re-runnable: when the
 * config already matches, only the member rewrite runs.
 */
export type InnerCircleUpdatePlan = {
  studio: { id: string; name: string }
  storedConfig: unknown
  current: RewardsConfig
  target: RewardsConfig
  giverSlug: string
  diff: Array<{ path: string; from: unknown; to: unknown }>
  switchedAt: string | null
  mode: PilotSwitchMode | null
  members: {
    /** Members whose permanent tier is the giver tier. */
    onTier: number
    /** Permanent rate moves to 15% (row, or the promotion's fallback). */
    raise: Array<{ customer_id: string; before: number; after: number; pays_before: number; pays_after: number; promotion: string | null }>
    /** Rows with no rate: they read the tier's rate, 15% once the config is saved. */
    readTierRate: number
    /** tier_override onto the giver tier from a lower tier: pays the better of 15% and the fallback. */
    overrides: Array<{ customer_id: string; pays_before: number; pays_after: number }>
  }
  /**
   * Members below the giver tier whose referral_count already meets the
   * threshold. The update does NOT move them: they move at their next
   * activated referral or their own next purchase (processTransaction).
   * referral_count includes referrals activated under earlier triggers.
   */
  alreadyQualify: Array<{ customer_id: string; tier: string; referral_count: number }>
  blockers: string[]
}

export function planInnerCircleUpdate(input: PilotSwitchInput): InnerCircleUpdatePlan {
  const settings = input.studio.settings ?? {}
  const storedConfig = settings.rewards_config ?? null
  const current = storedConfig ? migrateRewardsConfig(storedConfig) : DEFAULT_REWARDS_CONFIG
  const blockers: string[] = []

  const switchedAt = current.pilot_switched_at ?? null
  if (!switchedAt) blockers.push('Not switched yet: run the switch (without --update-inner-circle) first')
  if (current.tiers.length < 3) blockers.push(`The config has ${current.tiers.length} tiers; Inner Circle is tiers[2]`)

  const giverSlug = current.tiers[2]?.slug ?? 'inner_circle'
  const target: RewardsConfig = {
    ...current,
    tiers: current.tiers.map((t, i) => (i === 2 ? innerCircleTier(t) : t)),
    referrals: {
      ...current.referrals,
      referrer_cashback_bonus_per_ref: 0,
      referrer_commission_rate: 0,
    },
  }
  const rate = PILOT_RATES.giver
  const giverIdx = 2

  const promoBy = new Map(input.promotions.map((p) => [p.customer_id, p]))
  let onTier = 0
  let readTierRate = 0
  const raise: InnerCircleUpdatePlan['members']['raise'] = []
  const overrides: InnerCircleUpdatePlan['members']['overrides'] = []
  const alreadyQualify: InnerCircleUpdatePlan['alreadyQualify'] = []

  for (const m of input.members) {
    const promo = promoBy.get(m.id) ?? null
    const permanent = permanentDeal({ loyalty_stage: m.loyalty_stage, cashback_rate: m.cashback_rate }, promo, current.tiers)
    const paysBefore = dealRow(promo, permanent.tier, permanent.rate, current.tiers, m.loyalty_stage).cashback_rate

    if (permanent.tier === giverSlug) {
      onTier += 1
      if (!promo && m.cashback_rate == null) {
        readTierRate += 1
      } else if (permanent.rate > rate) {
        blockers.push(`Member ${m.id} on ${giverSlug} has ${permanent.rate}%, above ${rate}%: the rewrite would lower it`)
      } else if (permanent.rate !== rate) {
        raise.push({
          customer_id: m.id,
          before: permanent.rate,
          after: rate,
          pays_before: paysBefore,
          pays_after: dealRow(promo, giverSlug, rate, target.tiers, m.loyalty_stage).cashback_rate,
          promotion: promo ? promo.type : null,
        })
      }
      continue
    }

    if (promo?.type === 'tier_override' && promo.tier_slug === giverSlug) {
      overrides.push({
        customer_id: m.id,
        pays_before: paysBefore,
        pays_after: dealRow(promo, permanent.tier, permanent.rate, target.tiers, m.loyalty_stage).cashback_rate,
      })
    }

    const idx = Math.max(current.tiers.findIndex((t) => t.slug === permanent.tier), 0)
    if (idx < giverIdx && (m.referral_count ?? 0) >= INNER_CIRCLE_FRIENDS) {
      alreadyQualify.push({ customer_id: m.id, tier: permanent.tier, referral_count: m.referral_count ?? 0 })
    }
  }

  return {
    studio: { id: input.studio.id, name: input.studio.name },
    storedConfig,
    current,
    target,
    giverSlug,
    diff: diffConfig(current, target),
    switchedAt,
    mode: current.pilot_switch_mode ?? null,
    members: { onTier, raise, readTierRate, overrides },
    alreadyQualify,
    blockers,
  }
}

export function describeInnerCircleUpdatePlan(plan: InnerCircleUpdatePlan): string[] {
  const out: string[] = []
  const json = (v: unknown) => JSON.stringify(v)
  out.push(`Studio: ${plan.studio.name} (${plan.studio.id})`)
  out.push(plan.switchedAt ? `Switched at ${plan.switchedAt}, mode ${plan.mode ?? '(none)'}` : 'Not switched yet')
  out.push(`Inner Circle (tiers[2] = ${plan.giverSlug}) -> ${PILOT_RATES.giver}% at ${INNER_CIRCLE_FRIENDS} activated referrals`)
  out.push('')
  out.push('tiers[2] now:    ' + json(plan.current.tiers[2] ?? null))
  out.push('tiers[2] target: ' + json(plan.target.tiers[2] ?? null))
  out.push('')
  out.push(`Config diff (${plan.diff.length} fields${plan.diff.length === 0 ? ': config already updated' : ''}):`)
  for (const d of plan.diff) out.push(`  ${d.path}: ${json(d.from)} -> ${json(d.to)}`)
  out.push('')
  out.push(`Members on ${plan.giverSlug}: ${plan.members.onTier}`)
  out.push(`  permanent rate raised to ${PILOT_RATES.giver}%: ${plan.members.raise.length}`)
  for (const r of plan.members.raise) {
    out.push(`    ${r.customer_id}: ${r.before}% -> ${r.after}% (pays ${r.pays_before}% -> ${r.pays_after}%${r.promotion ? `, ${r.promotion} stays the main deal` : ''})`)
  }
  out.push(`  no rate on the row (reads the tier rate, ${PILOT_RATES.giver}% after the save): ${plan.members.readTierRate}`)
  out.push(`tier_override onto ${plan.giverSlug}: ${plan.members.overrides.length}`)
  for (const o of plan.members.overrides) out.push(`    ${o.customer_id}: pays ${o.pays_before}% -> ${o.pays_after}%`)
  out.push('')
  out.push(`Below ${plan.giverSlug} with referral_count >= ${INNER_CIRCLE_FRIENDS} (NOT moved now; they move at their next activated referral or own purchase): ${plan.alreadyQualify.length}`)
  for (const q of plan.alreadyQualify) out.push(`    ${q.customer_id}: ${q.tier}, referral_count ${q.referral_count}`)
  out.push('')
  out.push('No webhook, email, message or wallet-pass push is sent.')
  out.push(plan.blockers.length ? `BLOCKED (${plan.blockers.length}):` : 'No blockers.')
  for (const b of plan.blockers) out.push(`  ${b}`)
  return out
}

export type InnerCircleUpdateRecord = {
  updated_at: string
  giver_slug: string
  rate: number
  trigger: { type: string; threshold: number }
  previous_rewards_config: unknown
}

/**
 * Write the Inner Circle update. Refuses on any blocker, and when the stored
 * config moved since the plan was read. Saves the config (when it differs),
 * then raises the members already on the tier. No event, webhook or push.
 */
export async function applyInnerCircleUpdate(
  plan: InnerCircleUpdatePlan,
): Promise<{ configSaved: boolean; membersRaised: number; promotionsUpdated: number }> {
  if (plan.blockers.length > 0) {
    throw new PilotSwitchError(`Refusing to update: ${plan.blockers.join('; ')}`)
  }
  const studioId = plan.studio.id

  const { data: studio, error } = await adminSupabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()
  if (error || !studio) throw new PilotSwitchError(`Failed to reload studio settings: ${error?.message ?? 'not found'}`)
  const settings = (studio.settings as Record<string, unknown> | null) ?? {}
  if (JSON.stringify(settings.rewards_config ?? null) !== JSON.stringify(plan.storedConfig)) {
    throw new PilotSwitchError('The rewards config changed since the dry run. Run it again.')
  }

  const configSaved = plan.diff.length > 0
  if (configSaved) {
    const record: InnerCircleUpdateRecord = {
      updated_at: new Date().toISOString(),
      giver_slug: plan.giverSlug,
      rate: PILOT_RATES.giver,
      trigger: { ...INNER_CIRCLE_TRIGGER },
      previous_rewards_config: plan.storedConfig,
    }
    const { error: saveError } = await adminSupabase
      .from('studios')
      .update({ settings: { ...settings, rewards_config: plan.target, pilot_inner_circle_update: record } })
      .eq('id', studioId)
    if (saveError) throw new PilotSwitchError(`Failed to save rewards config: ${saveError.message}`)
  }

  const result = await rewriteTierMembers({
    studioId,
    tiers: plan.target.tiers,
    fromSlug: plan.giverSlug,
    rate: PILOT_RATES.giver,
  })
  return { configSaved, membersRaised: result.members.length, promotionsUpdated: result.promotionsUpdated }
}

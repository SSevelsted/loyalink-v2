import { adminSupabase } from '@/lib/studio-access'
import { pushCustomerPass } from '@/lib/pass-push'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG, type RewardsConfig } from '@/types/database'

/**
 * A member's deal: which tier they sit on and what a purchase pays them.
 *
 * - Permanent tier + rate: the member's own deal. With no promotion it lives
 *   on the customers row. While a promotion runs it lives in the promotion's
 *   fallback snapshot (member_promotions.original_tier_slug /
 *   original_cashback_rate), which revoke/expire restore to the row.
 * - Effective rate: what a purchase pays now. Best deal (owner decision
 *   2026-09-29): while a promotion runs, the member earns the higher of the
 *   promotion's rate and the fallback rate.
 *
 * customers.cashback_rate holds the effective rate, so the wallet pass, the v1
 * member GET and StreamInk show what the member earns. customers.loyalty_stage
 * holds the override tier during a tier_override, else the permanent tier.
 *
 * Every write that changes a member's permanent tier or rate goes through
 * applyPermanentDeal (one member) or rewritePermanentDeals (a studio's members
 * on a tier), so a change during a promotion lands in its fallback instead of
 * being lost when the promotion ends.
 */

export type DealPromotion = {
  id: string
  type: 'cashback_boost' | 'tier_override'
  /** The boost rate (cashback_boost). NULL for a tier_override. */
  cashback_rate: number | string | null
  /** The override tier (tier_override). NULL for a cashback_boost. */
  tier_slug: string | null
  original_tier_slug: string
  original_cashback_rate: number | string
}

export const DEAL_PROMOTION_COLUMNS = 'id, type, cashback_rate, tier_slug, original_tier_slug, original_cashback_rate'

type TierRates = ReadonlyArray<{ slug: string; cashback_rate: number }>

export class MemberDealError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'MemberDealError'
    this.status = status
  }
}

// ─── Pure rules ──────────────────────────────────────────────────────────────

/** The rate the promotion itself offers: the boost rate, or the override tier's rate. NULL when it offers none. */
export function promotionCashbackRate(
  promo: Pick<DealPromotion, 'type' | 'cashback_rate' | 'tier_slug'>,
  tiers: TierRates,
): number | null {
  if (promo.type === 'cashback_boost') {
    const rate = promo.cashback_rate == null ? NaN : Number(promo.cashback_rate)
    return Number.isFinite(rate) ? rate : null
  }
  const tier = promo.tier_slug ? tiers.find((t) => t.slug === promo.tier_slug) : undefined
  return tier ? Number(tier.cashback_rate) : null
}

/**
 * Best deal. No promotion: the fallback rate. cashback_boost: max(boost rate,
 * fallback rate). tier_override: max(override tier's rate, fallback rate).
 * A promotion that offers no rate (boost rate missing, override tier not in
 * the rewards config) pays the fallback rate.
 */
export function effectiveCashbackRate(
  promo: Pick<DealPromotion, 'type' | 'cashback_rate' | 'tier_slug'> | null | undefined,
  fallbackRate: number,
  tiers: TierRates,
): number {
  if (!promo) return fallbackRate
  const promoRate = promotionCashbackRate(promo, tiers)
  return promoRate == null ? fallbackRate : Math.max(promoRate, fallbackRate)
}

/** True when purchases pay the promotion's rate, i.e. it beats the fallback. */
export function promotionPays(
  promo: Pick<DealPromotion, 'type' | 'cashback_rate' | 'tier_slug'> | null | undefined,
  fallbackRate: number,
  tiers: TierRates,
): boolean {
  if (!promo) return false
  const promoRate = promotionCashbackRate(promo, tiers)
  return promoRate != null && promoRate > fallbackRate
}

type RowState = { loyalty_stage: string; cashback_rate: number | string | null }

/**
 * What customers.loyalty_stage / cashback_rate should hold for a permanent
 * tier + rate under a promotion (or none). A tier_override without a tier
 * keeps the row's current stage.
 */
export function dealRow(
  promo: Pick<DealPromotion, 'type' | 'cashback_rate' | 'tier_slug'> | null | undefined,
  permanentTier: string,
  permanentRate: number,
  tiers: TierRates,
  currentStage: string,
): { loyalty_stage: string; cashback_rate: number } {
  const stage = promo?.type === 'tier_override' ? (promo.tier_slug ?? currentStage) : permanentTier
  return { loyalty_stage: stage, cashback_rate: effectiveCashbackRate(promo, permanentRate, tiers) }
}

/** The member's own tier + rate: the promotion's fallback while one runs, else the row. */
export function permanentDeal(
  row: RowState,
  promo: Pick<DealPromotion, 'original_tier_slug' | 'original_cashback_rate'> | null | undefined,
  tiers: TierRates,
): { tier: string; rate: number } {
  if (promo) return { tier: promo.original_tier_slug, rate: Number(promo.original_cashback_rate) }
  const rate = row.cashback_rate != null
    ? Number(row.cashback_rate)
    : tiers.find((t) => t.slug === row.loyalty_stage)?.cashback_rate ?? tiers[0]?.cashback_rate ?? 0
  return { tier: row.loyalty_stage, rate }
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function loadRewardsConfig(studioId: string): Promise<RewardsConfig> {
  const { data: studio, error } = await adminSupabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()
  if (error && error.code !== 'PGRST116') {
    throw new MemberDealError(`Failed to load rewards config: ${error.message}`, 500)
  }
  const settings = studio?.settings as Record<string, unknown> | null
  return settings?.rewards_config ? migrateRewardsConfig(settings.rewards_config) : DEFAULT_REWARDS_CONFIG
}

export type MemberDeal = {
  customer: {
    id: string
    loyalty_stage: string
    cashback_rate: number | string | null
    referral_count: number | null
    metadata: Record<string, unknown> | null
  }
  promo: DealPromotion | null
  permanentTier: string
  permanentRate: number
}

/** A member's row + active promotion, scoped to the studio. NULL when the member is not in the studio. */
export async function loadMemberDeal(studioId: string, customerId: string, tiers: TierRates): Promise<MemberDeal | null> {
  const [{ data: customer, error: customerError }, { data: promo, error: promoError }] = await Promise.all([
    adminSupabase
      .from('customers')
      .select('id, loyalty_stage, cashback_rate, referral_count, metadata')
      .eq('id', customerId)
      .eq('studio_id', studioId)
      .maybeSingle(),
    adminSupabase
      .from('member_promotions')
      .select(DEAL_PROMOTION_COLUMNS)
      .eq('customer_id', customerId)
      .eq('studio_id', studioId)
      .eq('status', 'active')
      .maybeSingle(),
  ])
  if (customerError) throw new MemberDealError(`Failed to load member: ${customerError.message}`, 500)
  if (promoError) throw new MemberDealError(`Failed to load active promotion: ${promoError.message}`, 500)
  if (!customer) return null
  return memberDeal(customer as MemberDeal['customer'], (promo as DealPromotion | null) ?? null, tiers)
}

export function memberDeal(customer: MemberDeal['customer'], promo: DealPromotion | null, tiers: TierRates): MemberDeal {
  const permanent = permanentDeal(customer, promo, tiers)
  return { customer, promo, permanentTier: permanent.tier, permanentRate: permanent.rate }
}

// ─── One member ──────────────────────────────────────────────────────────────

export type PermanentDealInput = {
  studioId: string
  customerId: string
  /** New permanent tier. Omit to keep the member's own tier. */
  tierSlug?: string | null
  /** New permanent rate. Omit: the new tier's rate when tierSlug is set, else the current permanent rate. */
  cashbackRate?: number | null
  /** `source` on the tier_change event. */
  source: string
  /** The studio's rewards config, when the caller already has it. */
  config?: RewardsConfig
  /** The member's deal as the caller already read it. Skips the reads. */
  current?: MemberDeal
  /** Other customers columns written in the same update (spend totals, referral_count, metadata). */
  customerFields?: Record<string, unknown>
  /**
   * tier_change event: 'always' (manual tier edits log every edit),
   * 'on_tier_change' (default: only when the permanent tier moves), 'never'.
   */
  tierChangeEvent?: 'always' | 'on_tier_change' | 'never'
  /**
   * A failed tier_change insert: 'throw' (default) or 'log'. A purchase logs,
   * so an analytics hiccup does not fail a purchase whose writes went through.
   */
  onEventError?: 'throw' | 'log'
  /** Push a wallet-pass refresh after the write. Default false. */
  pushPass?: boolean
}

export type PermanentDealResult = {
  previous_tier_slug: string
  previous_cashback_rate: number
  /** The member's permanent tier after the change. */
  tier_slug: string
  /** The member's permanent rate after the change. */
  cashback_rate: number
  /** Tier in force now. Differs from tier_slug while a tier_override runs. */
  effective_tier_slug: string
  /** Rate purchases pay now (best deal). */
  effective_cashback_rate: number
  /** The active promotion whose fallback now holds the permanent deal, or null. */
  promotion: Pick<DealPromotion, 'id' | 'type'> | null
}

/**
 * Change a member's permanent tier and/or rate.
 *
 * No active promotion: the row takes the new tier + rate. Active promotion:
 * the promotion's fallback snapshot takes them, and the row shows the deal in
 * force (cashback_boost: new tier now, best-deal rate; tier_override: override
 * tier stays, best-deal rate). With a promotion the snapshot write also runs
 * when nothing permanent changes: filtered on status='active', it proves the
 * promotion still runs before the row is set to the promotion's rate.
 */
export async function applyPermanentDeal(input: PermanentDealInput): Promise<PermanentDealResult> {
  const { studioId, customerId, source, customerFields = {}, tierChangeEvent = 'on_tier_change' } = input
  const config = input.config ?? await loadRewardsConfig(studioId)
  const current = input.current ?? await loadMemberDeal(studioId, customerId, config.tiers)
  if (!current) throw new MemberDealError('Member not found', 404)

  let newTier = current.permanentTier
  let newRate = current.permanentRate
  if (input.tierSlug) {
    const tier = config.tiers.find((t) => t.slug === input.tierSlug)
    if (!tier) throw new MemberDealError(`Tier "${input.tierSlug}" not found in rewards config`, 400)
    newTier = tier.slug
    newRate = tier.cashback_rate
  }
  if (input.cashbackRate != null) newRate = Number(input.cashbackRate)
  if (!Number.isFinite(newRate) || newRate < 0) {
    throw new MemberDealError('cashback_rate must be a non-negative number', 400)
  }

  let promo = current.promo
  if (promo) {
    const { data: updated, error } = await adminSupabase
      .from('member_promotions')
      .update({ original_tier_slug: newTier, original_cashback_rate: newRate })
      .eq('id', promo.id)
      .eq('studio_id', studioId)
      .eq('status', 'active')
      .select('id')
    if (error) throw new MemberDealError(`Failed to update promotion fallback: ${error.message}`, 500)
    // The promotion ended since the read; its end restored the old fallback,
    // so the change now applies to the row directly.
    if (!updated || updated.length === 0) promo = null
  }

  // Without a promotion the row is written when the caller set a tier or rate
  // (also when unchanged, which repairs a row with no rate), and never on a
  // write that only carries other columns, so it cannot clobber a rate.
  const explicit = Boolean(input.tierSlug) || input.cashbackRate != null
  const row: Record<string, unknown> = { ...customerFields }
  if (promo || explicit) {
    Object.assign(row, dealRow(promo, newTier, newRate, config.tiers, current.customer.loyalty_stage))
  }

  if (Object.keys(row).length > 0) {
    const { error } = await adminSupabase
      .from('customers')
      .update(row)
      .eq('id', customerId)
      .eq('studio_id', studioId)
    if (error) throw new MemberDealError(`Failed to update member: ${error.message}`, 500)
  }

  if (input.pushPass) {
    pushCustomerPass(customerId)
  }

  const effective = dealRow(promo, newTier, newRate, config.tiers, current.customer.loyalty_stage)
  const result: PermanentDealResult = {
    previous_tier_slug: current.permanentTier,
    previous_cashback_rate: current.permanentRate,
    tier_slug: newTier,
    cashback_rate: newRate,
    effective_tier_slug: effective.loyalty_stage,
    effective_cashback_rate: effective.cashback_rate,
    promotion: promo ? { id: promo.id, type: promo.type } : null,
  }

  const tierMoved = newTier !== current.permanentTier
  if (tierChangeEvent === 'always' || (tierChangeEvent === 'on_tier_change' && tierMoved)) {
    const { error } = await adminSupabase.from('analytics_events').insert({
      studio_id: studioId,
      event_type: 'tier_change',
      customer_id: customerId,
      metadata: tierChangeMetadata(result, config, source),
    })
    if (error) {
      const message = `Tier changed but the tier_change event failed to save: ${error.message}`
      if (input.onEventError === 'log') console.error(`[member-deal] ${message}`, { studioId, customerId })
      else throw new MemberDealError(message, 500)
    }
  }

  return result
}

/** analytics_events.metadata of a tier_change event (the Tier History card reads it). */
export function tierChangeMetadata(
  change: Pick<PermanentDealResult, 'previous_tier_slug' | 'tier_slug' | 'cashback_rate' | 'effective_cashback_rate' | 'promotion'>,
  config: RewardsConfig,
  source: string,
): Record<string, unknown> {
  const tierName = (slug: string) => config.tiers.find((t) => t.slug === slug)?.name ?? slug
  return {
    from_tier: change.previous_tier_slug,
    from_tier_name: tierName(change.previous_tier_slug),
    to_tier: change.tier_slug,
    to_tier_name: tierName(change.tier_slug),
    cashback_rate: change.cashback_rate,
    effective_cashback_rate: change.effective_cashback_rate,
    source,
    ...(change.promotion
      ? { deferred_by_promotion: change.promotion.id, promotion_type: change.promotion.type }
      : {}),
  }
}

// ─── A studio's members on one tier ──────────────────────────────────────────

const PAGE_SIZE = 1000 // PostgREST max rows per read
const ID_CHUNK = 100 // ids per `.in()` filter, keeps the URL short

async function readAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new MemberDealError(error.message, 500)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return out
  }
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export type TierRewriteInput = {
  studioId: string
  /** The tiers in force after the change: override rates and best deal read them. */
  tiers: TierRates
  /** Members whose permanent tier is this slug. */
  fromSlug: string
  /** Their new permanent tier. Default fromSlug: a rate-only change. */
  toSlug?: string
  /** Their new permanent rate. */
  rate: number
}

export type RewrittenMember = Pick<
  PermanentDealResult,
  'previous_tier_slug' | 'previous_cashback_rate' | 'tier_slug' | 'cashback_rate' | 'effective_cashback_rate' | 'promotion'
> & { customer_id: string }

/**
 * Move every member of ONE studio whose permanent tier is `fromSlug` to
 * `toSlug` + `rate` (rewards-config migrations).
 *
 * - No active promotion: the row takes the new tier + rate. A rate-only
 *   change skips rows that already hold the rate, and rows with no rate (as
 *   PostgREST's neq did before).
 * - Active promotion: its fallback snapshot takes the new tier + rate, a
 *   tier_override on `fromSlug` moves to `toSlug`, and the row shows the best
 *   deal under the new tiers.
 *
 * Returns the members whose permanent deal changed (for tier_change events)
 * and the count of promotions rewritten.
 */
export async function rewriteTierMembers(
  input: TierRewriteInput,
): Promise<{ members: RewrittenMember[]; promotionsUpdated: number }> {
  const { studioId, tiers, fromSlug, rate } = input
  const toSlug = input.toSlug ?? fromSlug
  const remap = toSlug !== fromSlug
  const members: RewrittenMember[] = []
  let promotionsUpdated = 0

  type PromoRow = DealPromotion & { customer_id: string }
  const promos = await readAllPages<PromoRow>((from, to) =>
    adminSupabase
      .from('member_promotions')
      .select(`${DEAL_PROMOTION_COLUMNS}, customer_id`)
      .eq('studio_id', studioId)
      .eq('status', 'active')
      .order('id')
      .range(from, to))
  const promoted = new Set(promos.map((p) => p.customer_id))

  // Members without a promotion: the row is their permanent deal.
  type TierRow = { id: string; loyalty_stage: string; cashback_rate: number | string | null }
  const onTier = await readAllPages<TierRow>((from, to) =>
    adminSupabase
      .from('customers')
      .select('id, loyalty_stage, cashback_rate')
      .eq('studio_id', studioId)
      .eq('loyalty_stage', fromSlug)
      .order('id')
      .range(from, to))
  const plain = onTier.filter((c) =>
    !promoted.has(c.id) && (remap || (c.cashback_rate != null && Number(c.cashback_rate) !== rate)))
  const plainUpdate = remap ? { loyalty_stage: toSlug, cashback_rate: rate } : { cashback_rate: rate }
  for (const ids of chunks(plain.map((c) => c.id), ID_CHUNK)) {
    const { error } = await adminSupabase
      .from('customers')
      .update(plainUpdate)
      .eq('studio_id', studioId)
      .eq('loyalty_stage', fromSlug)
      .in('id', ids)
    if (error) throw new MemberDealError(`Failed to update members on ${fromSlug}: ${error.message}`, 500)
  }
  for (const c of plain) {
    members.push({
      customer_id: c.id,
      previous_tier_slug: fromSlug,
      previous_cashback_rate: Number(c.cashback_rate ?? 0),
      tier_slug: toSlug,
      cashback_rate: rate,
      effective_cashback_rate: rate,
      promotion: null,
    })
  }

  // Members with a promotion on this tier: as fallback, or as the override.
  const touched = promos.filter((p) =>
    p.original_tier_slug === fromSlug || (p.type === 'tier_override' && p.tier_slug === fromSlug))
  if (touched.length === 0) return { members, promotionsUpdated }

  const rows = new Map<string, TierRow>()
  for (const ids of chunks(touched.map((p) => p.customer_id), ID_CHUNK)) {
    const { data, error } = await adminSupabase
      .from('customers')
      .select('id, loyalty_stage, cashback_rate')
      .eq('studio_id', studioId)
      .in('id', ids)
    if (error) throw new MemberDealError(`Failed to load promoted members: ${error.message}`, 500)
    for (const row of (data ?? []) as TierRow[]) rows.set(row.id, row)
  }

  for (const p of touched) {
    const row = rows.get(p.customer_id)
    if (!row) continue

    const fallbackMoves = p.original_tier_slug === fromSlug
      && (toSlug !== fromSlug || Number(p.original_cashback_rate) !== rate)
    const promoUpdate: Partial<DealPromotion> = {}
    if (fallbackMoves) Object.assign(promoUpdate, { original_tier_slug: toSlug, original_cashback_rate: rate })
    if (remap && p.type === 'tier_override' && p.tier_slug === fromSlug) promoUpdate.tier_slug = toSlug

    if (Object.keys(promoUpdate).length > 0) {
      const { data: updated, error } = await adminSupabase
        .from('member_promotions')
        .update(promoUpdate)
        .eq('id', p.id)
        .eq('studio_id', studioId)
        .eq('status', 'active')
        .select('id')
      if (error) throw new MemberDealError(`Failed to update promotion ${p.id}: ${error.message}`, 500)
      if (!updated || updated.length === 0) {
        // Ended since the read and restored the old fallback to the row: the
        // member is now a plain member on fromSlug.
        if (fallbackMoves) {
          const { error: plainError } = await adminSupabase
            .from('customers')
            .update(plainUpdate)
            .eq('id', p.customer_id)
            .eq('studio_id', studioId)
            .eq('loyalty_stage', fromSlug)
          if (plainError) throw new MemberDealError(`Failed to update member ${p.customer_id}: ${plainError.message}`, 500)
        }
        continue
      }
      promotionsUpdated += 1
    }

    const next = { ...p, ...promoUpdate }
    const permanent = permanentDeal(row, next, tiers)
    const expected = dealRow(next, permanent.tier, permanent.rate, tiers, row.loyalty_stage)
    if (row.loyalty_stage !== expected.loyalty_stage || Number(row.cashback_rate) !== expected.cashback_rate) {
      const { error } = await adminSupabase
        .from('customers')
        .update(expected)
        .eq('id', p.customer_id)
        .eq('studio_id', studioId)
      if (error) throw new MemberDealError(`Failed to update member ${p.customer_id}: ${error.message}`, 500)
    }

    if (fallbackMoves) {
      members.push({
        customer_id: p.customer_id,
        previous_tier_slug: p.original_tier_slug,
        previous_cashback_rate: Number(p.original_cashback_rate),
        tier_slug: toSlug,
        cashback_rate: rate,
        effective_cashback_rate: expected.cashback_rate,
        promotion: { id: p.id, type: p.type },
      })
    }
  }

  return { members, promotionsUpdated }
}

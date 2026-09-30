import { adminSupabase } from '@/lib/studio-access'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig, TierConfig, UpgradeTriggerConfig } from '@/types/database'
import { passServiceFetch } from '@/lib/pass-service'
import { expirePromotion } from '@/lib/services/promotion-service'
import { fireWebhook } from '@/lib/services/webhook-service'
import { sendTierUpgrade } from '@/lib/email/send'
import { activateReferral, referralTriggerMet } from '@/lib/services/referral-service'
import { buildTransactionPushMessage } from '@/lib/pass-push-messages'
import { syncLegacyPasskitCustomer } from '@/lib/services/legacy-passkit-sync-service'
import {
  applyPermanentDeal,
  effectiveCashbackRate,
  MemberDealError,
  memberDeal,
  promotionPays,
  type PermanentDealResult,
} from '@/lib/services/member-deal-service'

type ProcessTransactionInput = {
  customerId: string
  studioId: string
  amount: number
  cashAmount?: number
  isDeposit?: boolean
  createdBy?: string | null
  sourceTransactionId?: string | null
}

type TransactionSummary = {
  tierUpgraded: boolean
  previousTier: { slug: string; name: string; cashbackRate: number } | null
  currentTier: { slug: string; name: string; cashbackRate: number; index: number }
  nextTier: {
    slug: string
    name: string
    cashbackRate: number
    trigger: UpgradeTriggerConfig | null
    progress: { current: number; threshold: number; remaining: number } | null
  } | null
  cashbackEarned: number
  cashbackRate: number
  newBalance: number
  totalSpend: number
  isMaxTier: boolean
}

type ProcessTransactionResult = {
  success: true
  results: string[]
  summary: TransactionSummary
}

type LegacyLoyaltyMetadata = {
  provider?: string | null
  legacy_project?: string | null
  legacy_studio_id?: string | null
  legacy_customer_id?: string | null
  legacy_member_id?: string | null
  legacy_passkit_id?: string | null
  barcode_payload?: string | null
  barcode_pid?: string | null
  barcode_pid_type?: string | null
  card_install_status?: string | null
  card_issued_at?: string | null
  card_first_installed_at?: string | null
  card_uninstalled_at?: string | null
  raw?: Record<string, unknown>
}

// ─── Idempotency ─────────────────────────────────────────────────────────────
// A retried POST /api/v1/transactions (client timeout, crashed job runner)
// must not credit the member twice. Callers pass an idempotency_key; the first
// request claims a (studio_id, key) row, processes, and stores its result on
// the row. A replay of the same key gets the stored result back instead of
// re-processing.
//
// Fail-closed by design: a claim whose original request died mid-processing
// stays 'pending' and keeps answering 409 — processTransaction's writes are
// not transactional, so re-running after a partial credit could pay twice.
// Resolving a stuck key means checking the member's transactions and deleting
// the claim row by hand.

export type IdempotencyClaim =
  | { kind: 'proceed'; claimId: string }
  | { kind: 'replay'; result: ProcessTransactionResult }
  | { kind: 'in_flight' }

export async function claimTransactionIdempotencyKey(
  studioId: string,
  idempotencyKey: string,
  customerId: string,
): Promise<IdempotencyClaim> {
  const { data: claimed, error } = await adminSupabase
    .from('transaction_idempotency_keys')
    .insert({ studio_id: studioId, idempotency_key: idempotencyKey, customer_id: customerId })
    .select('id')
    .single()

  if (claimed && !error) return { kind: 'proceed', claimId: claimed.id }
  if (error && error.code !== '23505') {
    throw new TransactionError(`Failed to reserve idempotency key: ${error.message}`, 500)
  }

  // Unique violation — an earlier request holds this key.
  const { data: existing } = await adminSupabase
    .from('transaction_idempotency_keys')
    .select('status, result')
    .eq('studio_id', studioId)
    .eq('idempotency_key', idempotencyKey)
    .single()

  if (existing?.status === 'completed' && existing.result) {
    return { kind: 'replay', result: existing.result as ProcessTransactionResult }
  }
  // Pending (or the twin released its claim between our insert and read):
  // either way the caller should back off and retry.
  return { kind: 'in_flight' }
}

export async function completeTransactionIdempotencyKey(
  claimId: string,
  result: ProcessTransactionResult,
): Promise<void> {
  const { error } = await adminSupabase
    .from('transaction_idempotency_keys')
    .update({ status: 'completed', result, completed_at: new Date().toISOString() })
    .eq('id', claimId)
  if (error) {
    // The transaction itself went through; failing the request now would make
    // the caller retry and 409 against its own claim. Log and move on — the
    // key stays pending, which fails closed.
    console.error('[transactions] failed to store idempotency result:', error.message)
  }
}

export async function releaseTransactionIdempotencyKey(claimId: string): Promise<void> {
  await adminSupabase.from('transaction_idempotency_keys').delete().eq('id', claimId)
}

export async function processTransaction(input: ProcessTransactionInput): Promise<ProcessTransactionResult> {
  const { customerId, studioId, amount, cashAmount, isDeposit, sourceTransactionId } = input

  // Fetch customer. Scoped to the studio: the dashboard route passes a
  // client-supplied customerId after checking access to studioId only.
  const { data: customer, error: custErr } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .single()

  if (custErr || !customer) {
    throw new TransactionError('Customer not found', 404)
  }

  // Fetch rewards config
  const { data: studio } = await adminSupabase
    .from('studios')
    .select('settings, is_agency')
    .eq('id', studioId)
    .single()

  const settings = studio?.settings as Record<string, unknown> | null
  const config: RewardsConfig = settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : DEFAULT_REWARDS_CONFIG

  if (!config.enabled) {
    throw new TransactionError('Rewards not enabled', 400)
  }

  const results: string[] = []
  const webhookTasks: Promise<void>[] = []
  const queueWebhook = (...args: Parameters<typeof fireWebhook>) => {
    webhookTasks.push(fireWebhook(...args))
  }
  const newSpendTotal = Number(customer.total_real_spend || 0) + amount

  // 1. Active promotion. One past its end date ends first: it no longer pays,
  // and a tier upgrade below is not overwritten by its stale fallback.
  const { data: activePromo, error: promoErr } = await adminSupabase
    .from('member_promotions')
    .select('*')
    .eq('customer_id', customerId)
    .eq('studio_id', studioId)
    .eq('status', 'active')
    .maybeSingle()
  if (promoErr) throw new TransactionError(`Failed to load active promotion: ${promoErr.message}`, 500)

  let promo = activePromo
  let rowState = { loyalty_stage: customer.loyalty_stage as string, cashback_rate: customer.cashback_rate }
  if (promo && promo.expires_at && new Date(promo.expires_at) <= new Date()) {
    await expirePromotion(promo.id, customerId, promo.original_tier_slug, Number(promo.original_cashback_rate))
    results.push(`Promotion expired (time limit reached)`)
    queueWebhook(studioId, 'promotion.expired', customerId, { reason: 'time_limit' })
    rowState = { loyalty_stage: promo.original_tier_slug, cashback_rate: promo.original_cashback_rate }
    promo = null
  }
  const deal = memberDeal({ ...customer, ...rowState }, promo, config.tiers)

  // 2. The rate this purchase pays: the deal in force before it (an upgrade
  // below pays from the next purchase). Best deal while a promotion runs.
  const cashbackRate = effectiveCashbackRate(promo, deal.permanentRate, config.tiers)
  const promoApplied = promotionPays(promo, deal.permanentRate, config.tiers)

  // 3. N-tier upgrades, from the member's OWN tier (during a tier_override
  // that is the promotion's fallback, not the override on the row).
  let upgradeTo: TierConfig | null = null
  const currentIdx = config.tiers.findIndex(t => t.slug === deal.permanentTier)
  for (let i = Math.max(currentIdx, 0) + 1; i < config.tiers.length; i++) {
    const tier = config.tiers[i]
    if (!tier.upgrade_trigger) continue
    if (shouldUpgrade(customer, tier.upgrade_trigger, newSpendTotal, isDeposit)) {
      upgradeTo = tier
      results.push(`Upgraded to ${tier.slug} at ${tier.cashback_rate}%`)
    } else {
      break
    }
  }
  const tierChanged = upgradeTo != null

  // 4. Spend total, has_purchased and any upgrade in one member write. During
  // a promotion the upgrade lands in its fallback, and the row shows the best
  // deal. Also writes the tier_change event.
  const spendUpdates: Record<string, unknown> = { total_real_spend: newSpendTotal }
  if (!customer.has_purchased) spendUpdates.has_purchased = true
  let dealAfter: PermanentDealResult
  try {
    dealAfter = await applyPermanentDeal({
      studioId,
      customerId,
      tierSlug: upgradeTo?.slug,
      source: 'purchase',
      config,
      current: deal,
      customerFields: spendUpdates,
      onEventError: 'log',
    })
  } catch (err) {
    if (err instanceof MemberDealError) throw new TransactionError(err.message, err.status)
    throw err
  }

  if (upgradeTo) {
    queueWebhook(studioId, 'tier.upgraded', customerId, {
      from_tier: deal.permanentTier,
      to_tier: upgradeTo.slug,
      to_tier_name: upgradeTo.name,
      cashback_rate: upgradeTo.cashback_rate,
    })

    // Send tier upgrade email (fire-and-forget)
    sendTierUpgrade(customerId, studioId, deal.permanentTier, upgradeTo.slug)
  }

  // 5. Referral activation: this friend's first transaction that meets the
  // studio's trigger (referralTriggerMet), once per referral.
  if (config.referrals.enabled) {
    const { data: referralRow, error: referralErr } = await adminSupabase
      .from('referrals')
      .select('id, referrer_customer_id, referred_customer_id')
      .eq('referred_customer_id', customerId)
      .eq('studio_id', studioId)
      .eq('status', 'pending')
      .maybeSingle()
    if (referralErr) {
      console.error('[transactions] pending referral lookup failed:', referralErr.message)
      results.push(`Referral check failed: ${referralErr.message}`)
    } else if (referralRow && referralTriggerMet(
      config.referrals.activation_trigger,
      customer,
      { newSpendTotal, isDeposit },
    )) {
      await activateReferral({ referral: referralRow, studioId, config, results, queueWebhook })
    }
  }

  // 6. Cashback calculation
  const cashableAmount = cashAmount != null ? cashAmount : amount
  const cashbackAmount = cashableAmount * cashbackRate / 100

  if (cashbackAmount > 0) {
    const desc = promoApplied
      ? `${cashbackRate}% cashback (promotion) on ${amount} kr purchase`
      : `${cashbackRate}% cashback on ${amount} kr purchase`

    await adminSupabase.from('transactions').insert({
      customer_id: customerId,
      studio_id: studioId,
      type: 'cashback',
      amount: cashbackAmount,
      description: desc,
    })

    const newBalance = Number(customer.balance ?? 0) + cashbackAmount
    await adminSupabase.from('customers').update({ balance: newBalance }).eq('id', customerId)

    results.push(`Cashback: ${cashbackAmount.toFixed(2)} kr (${cashbackRate}%${promoApplied ? ' — promotion' : ''})`)

    queueWebhook(studioId, 'balance.updated', customerId, {
      new_balance: newBalance,
      cashback_earned: cashbackAmount,
      cashback_rate: cashbackRate,
      promotion_applied: promoApplied,
    })
  }

  const transactedAt = new Date().toISOString()
  // Legacy GHL/PassKit context is internal to agency-managed (legacy) studios.
  // Never expose it to self-serve Loyalink clients — gate on is_agency.
  const legacyLoyalty = studio?.is_agency === true
    ? await getLegacyWebhookContext(customerId, customer.metadata)
    : null
  queueWebhook(studioId, 'transaction.created', customerId, {
    transaction_id: sourceTransactionId ?? `loyalink-${customerId}-${Date.now()}`,
    amount,
    amount_cents: Math.round(amount * 100),
    cash_amount: cashAmount ?? amount,
    payment_type: isDeposit ? 'deposit' : 'full_payment',
    currency: (customer.currency as string | null | undefined) ?? (settings?.currency as string | null | undefined) ?? 'DKK',
    transacted_at: transactedAt,
    total_spend: newSpendTotal,
    customer: {
      id: customer.id,
      member_id: customer.member_id,
      contact_id: customer.contact_id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyalty_stage: dealAfter.effective_tier_slug,
      balance: Number(customer.balance ?? 0) + cashbackAmount,
      cashback_rate: dealAfter.effective_cashback_rate,
      referral_code: customer.referral_code,
      referral_count: customer.referral_count,
      has_purchased: true,
      total_real_spend: newSpendTotal,
      currency: customer.currency,
      language: customer.language,
      tags: customer.tags,
      pass_provider: customer.pass_provider,
      landing_page_id: customer.landing_page_id,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      ...(legacyLoyalty ? { legacy_loyalty: legacyLoyalty } : {}),
    },
    ...(legacyLoyalty ? { legacy_loyalty: legacyLoyalty } : {}),
  })

  const tierUpgradeForMessage = upgradeTo
    ? { name: upgradeTo.name, cashbackRate: upgradeTo.cashback_rate }
    : null

  const cashbackForMessage = cashbackAmount > 0
    ? {
        amount: cashbackAmount,
        rate: cashbackRate,
        newBalance: Number(customer.balance ?? 0) + cashbackAmount,
        currency: (customer.currency as string) || 'DKK',
      }
    : null

  const pushMessage = buildTransactionPushMessage({
    language: (settings?.language as string | null | undefined) ?? null,
    tierUpgrade: tierUpgradeForMessage,
    cashback: cashbackForMessage,
  })

  if (pushMessage) {
    await adminSupabase
      .from('wallet_passes')
      .update({ push_message: pushMessage })
      .eq('customer_id', customerId)
  }

  const legacySync = await syncLegacyPasskitCustomer({
    customerId,
    studioId,
    balance: Number(customer.balance ?? 0) + cashbackAmount,
    totalSpend: newSpendTotal,
    cashbackRate,
    transaction: {
      amount,
      cashAmount: cashableAmount,
      cashbackEarned: cashbackAmount,
      isDeposit,
      currency: (customer.currency as string | null | undefined) ?? (settings?.currency as string | null | undefined) ?? 'DKK',
    },
  })
  if (legacySync.status === 'synced') {
    results.push(
      legacySync.passRowsUpdated > 0
        ? `Legacy PassKit synced (${legacySync.passRowsUpdated} pass${legacySync.passRowsUpdated === 1 ? '' : 'es'} touched)`
        : 'Legacy PassKit customer synced'
    )
    if (legacySync.passkit.status === 'updated') {
      results.push(`Old PassKit card updated (${legacySync.passkit.points} points)`)
    } else if (legacySync.passkit.status === 'failed') {
      results.push(`Old PassKit card update failed: ${legacySync.passkit.error}`)
    } else if (legacySync.passkit.reason === 'not_configured') {
      results.push('Old PassKit card update skipped: PassKit API is not configured')
    } else if (legacySync.passkit.reason === 'missing_member_id') {
      results.push('Old PassKit card update skipped: missing legacy member ID')
    }
  } else if (legacySync.status === 'failed') {
    results.push(`Legacy PassKit sync failed: ${legacySync.error}`)
  }

  triggerPassUpdate(customerId)

  // 7. Handle promotion usage decrement / expiry after transaction.
  // Deposits are not completed transactions, so they don't consume a usage-based
  // boost — mirrors the deposit exclusion in shouldUpgrade() for tier upgrades.
  // The fallback restored is the one step 4 wrote (it holds any upgrade).
  const livePromo = dealAfter.promotion ? promo : null
  if (livePromo && livePromo.remaining_transactions != null && !isDeposit) {
    const remaining = livePromo.remaining_transactions - 1
    if (remaining <= 0) {
      await expirePromotion(livePromo.id, customerId, dealAfter.tier_slug, dealAfter.cashback_rate)
      results.push(`Promotion expired (usage limit reached)`)
      queueWebhook(studioId, 'promotion.expired', customerId, { reason: 'usage_limit' })
    } else {
      await adminSupabase
        .from('member_promotions')
        .update({ remaining_transactions: remaining })
        .eq('id', livePromo.id)
    }
  }

  // 8. Referral commission, on every friend purchase inside the window
  // (including the one that activated the referral). A NULL expiry is an
  // unlimited window (referrer_commission_duration_days = 0).
  if (config.referrals.enabled) {
    const { data: activeReferral } = await adminSupabase
      .from('referrals')
      .select('*')
      .eq('referred_customer_id', customerId)
      .eq('status', 'activated')
      .maybeSingle()
    const inWindow = activeReferral != null
      && (activeReferral.commission_expires_at == null || new Date(activeReferral.commission_expires_at) > new Date())

    if (activeReferral && inWindow) {
      const commission = amount * config.referrals.referrer_commission_rate / 100

      if (commission > 0) {
        await adminSupabase.from('transactions').insert({
          customer_id: activeReferral.referrer_customer_id,
          studio_id: studioId,
          type: 'referral_commission',
          amount: commission,
          description: `${config.referrals.referrer_commission_rate}% commission from referral`,
          source_customer_id: customerId,
        })

        const { data: referrer } = await adminSupabase
          .from('customers')
          .select('balance')
          .eq('id', activeReferral.referrer_customer_id)
          .single()

        if (referrer) {
          await adminSupabase
            .from('customers')
            .update({ balance: Number(referrer.balance) + commission })
            .eq('id', activeReferral.referrer_customer_id)
        }

        await adminSupabase
          .from('referrals')
          .update({
            total_commission_earned: Number(activeReferral.total_commission_earned || 0) + commission,
          })
          .eq('id', activeReferral.id)

        results.push(`Commission: ${commission.toFixed(2)} kr to referrer`)
      }
    }
  }

  // Build summary. Tiers here are the member's own (permanent) tier, which
  // upgrades and next-tier progress are measured on.
  const updatedTierSlug = dealAfter.tier_slug
  const updatedTierIdx = config.tiers.findIndex(t => t.slug === updatedTierSlug)
  const updatedTier = config.tiers[updatedTierIdx] ?? config.tiers[0]
  const nextTier = updatedTierIdx >= 0 && updatedTierIdx < config.tiers.length - 1
    ? config.tiers[updatedTierIdx + 1]
    : null

  let nextTierProgress: { current: number; threshold: number; remaining: number } | null = null
  if (nextTier?.upgrade_trigger?.type === 'total_spend' && nextTier.upgrade_trigger.threshold) {
    const threshold = nextTier.upgrade_trigger.threshold
    nextTierProgress = {
      current: newSpendTotal,
      threshold,
      remaining: Math.max(0, threshold - newSpendTotal),
    }
  }

  await Promise.allSettled(webhookTasks)

  return {
    success: true,
    results,
    summary: {
      tierUpgraded: tierChanged,
      previousTier: tierChanged ? {
        slug: deal.permanentTier,
        name: config.tiers.find(t => t.slug === deal.permanentTier)?.name ?? deal.permanentTier,
        cashbackRate: deal.permanentRate,
      } : null,
      currentTier: {
        slug: updatedTier.slug,
        name: updatedTier.name,
        cashbackRate: updatedTier.cashback_rate,
        index: updatedTierIdx >= 0 ? updatedTierIdx : 0,
      },
      nextTier: nextTier ? {
        slug: nextTier.slug,
        name: nextTier.name,
        cashbackRate: nextTier.cashback_rate,
        trigger: nextTier.upgrade_trigger ?? null,
        progress: nextTierProgress,
      } : null,
      cashbackEarned: cashbackAmount,
      cashbackRate,
      newBalance: Number(customer.balance ?? 0) + cashbackAmount,
      totalSpend: newSpendTotal,
      isMaxTier: nextTier === null,
    },
  }
}

async function getLegacyWebhookContext(customerId: string, metadata: unknown) {
  const legacyMetadata = ((metadata as Record<string, unknown> | null)?.legacy_loyalty ?? null) as LegacyLoyaltyMetadata | null

  const { data: link } = await adminSupabase
    .from('legacy_loyalty_links')
    .select('provider, legacy_project, legacy_studio_id, legacy_customer_id, legacy_member_id, legacy_passkit_id, legacy_barcode_payload, legacy_payload')
    .eq('customer_id', customerId)
    .eq('provider', 'passkit_lovable')
    .maybeSingle()

  if (!legacyMetadata && !link) return null

  const metadataRaw = legacyMetadata?.raw && typeof legacyMetadata.raw === 'object'
    ? legacyMetadata.raw
    : null
  const linkPayload = link?.legacy_payload && typeof link.legacy_payload === 'object'
    ? link.legacy_payload as Record<string, unknown>
    : null
  const raw = {
    ...(linkPayload ?? {}),
    ...(metadataRaw ?? {}),
  }

  const legacyContactId = stringOrNull(raw.contact_id)
  const legacyEmail = stringOrNull(raw?.email)
  const legacyPhone = stringOrNull(raw?.phone)
  const legacyName = stringOrNull(raw?.name)
  const legacyLocationId = stringOrNull(raw?.location) ?? stringOrNull(raw?.legacy_location_id)
  const legacyGhlApi = stringOrNull(raw?.ghl_api)
    ?? stringOrNull(raw?.gohighlevel_api)
    ?? stringOrNull(raw?.legacy_ghl_api)
  const legacyCustomerId = stringOrNull(link?.legacy_customer_id) ?? legacyMetadata?.legacy_customer_id ?? null
  const legacyMemberId = stringOrNull(link?.legacy_member_id) ?? legacyMetadata?.legacy_member_id ?? null
  const legacyPasskitId = stringOrNull(link?.legacy_passkit_id) ?? legacyMetadata?.legacy_passkit_id ?? null
  const barcodePayload = stringOrNull(link?.legacy_barcode_payload) ?? legacyMetadata?.barcode_payload ?? null
  const barcodePid = legacyMetadata?.barcode_pid ?? stringOrNull(raw?.barcode_pid)

  return {
    provider: stringOrNull(link?.provider) ?? legacyMetadata?.provider ?? 'passkit_lovable',
    legacy_project: stringOrNull(link?.legacy_project) ?? legacyMetadata?.legacy_project ?? 'lovable',
    legacy_studio_id: stringOrNull(link?.legacy_studio_id) ?? legacyMetadata?.legacy_studio_id ?? null,
    legacy_customer_id: legacyCustomerId,
    legacy_member_id: legacyMemberId,
    legacy_passkit_id: legacyPasskitId,
    legacy_barcode_payload: barcodePayload,
    barcode_pid: barcodePid,
    barcode_pid_type: legacyMetadata?.barcode_pid_type ?? stringOrNull(raw?.barcode_pid_type),
    legacy_contact_id: legacyContactId,
    legacy_name: legacyName,
    legacy_email: legacyEmail,
    legacy_phone: legacyPhone,
    legacy_location_id: legacyLocationId,
    legacy_ghl_api: legacyGhlApi,
    legacy_pass_provider: stringOrNull(raw?.pass_provider),
    card_install_status: legacyMetadata?.card_install_status ?? stringOrNull(raw?.card_install_status),
    card_issued_at: legacyMetadata?.card_issued_at ?? stringOrNull(raw?.card_issued_at),
    card_first_installed_at: legacyMetadata?.card_first_installed_at ?? stringOrNull(raw?.card_first_installed_at),
    card_uninstalled_at: legacyMetadata?.card_uninstalled_at ?? stringOrNull(raw?.card_uninstalled_at),
    legacy_created_at: stringOrNull(raw?.created_at),
    legacy_updated_at: stringOrNull(raw?.updated_at),
    search_keys: [
      legacyCustomerId,
      legacyMemberId,
      legacyPasskitId,
      barcodePayload,
      barcodePid,
      legacyContactId,
      legacyEmail,
      legacyPhone,
      legacyLocationId,
      legacyGhlApi,
    ].filter((value): value is string => !!value),
  }
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function shouldUpgrade(
  customer: { has_purchased: boolean; total_real_spend: number; referral_count: number; created_at: string },
  trigger: UpgradeTriggerConfig,
  newSpendTotal: number,
  isDeposit = false,
): boolean {
  switch (trigger.type) {
    case 'first_purchase':
      return !customer.has_purchased
    case 'first_full_payment':
      return !customer.has_purchased && !isDeposit
    case 'total_spend':
      return Number(customer.total_real_spend || 0) < (trigger.threshold ?? 0)
        && newSpendTotal >= (trigger.threshold ?? 0)
    case 'referral_count':
      return customer.referral_count >= (trigger.threshold ?? 0)
    case 'days_member': {
      const days = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / 86400000)
      return days >= (trigger.threshold ?? 0)
    }
    default:
      return false
  }
}

function triggerPassUpdate(customerId: string) {
  void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})
}

export class TransactionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'TransactionError'
    this.status = status
  }
}

import { adminSupabase } from '@/lib/studio-access'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig, getReferralUnlockTier } from '@/types/database'
import type { RewardsConfig, UpgradeTriggerConfig } from '@/types/database'
import { passServiceFetch } from '@/lib/pass-service'
import { expirePromotion } from '@/lib/services/promotion-service'
import { fireWebhook } from '@/lib/services/webhook-service'
import { sendTierUpgrade, sendReferralReward } from '@/lib/email/send'
import { buildTransactionPushMessage } from '@/lib/pass-push-messages'
import { syncLegacyPasskitCustomer } from '@/lib/services/legacy-passkit-sync-service'

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

export async function processTransaction(input: ProcessTransactionInput): Promise<ProcessTransactionResult> {
  const { customerId, studioId, amount, cashAmount, isDeposit, sourceTransactionId } = input

  // Fetch customer
  const { data: customer, error: custErr } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (custErr || !customer) {
    throw new TransactionError('Customer not found', 404)
  }

  // Fetch rewards config
  const { data: studio } = await adminSupabase
    .from('studios')
    .select('settings')
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
  const newSpendTotal = Number(customer.total_real_spend || 0) + amount

  // 1. Always update spend total and has_purchased
  const baseUpdates: Record<string, unknown> = {
    total_real_spend: newSpendTotal,
  }
  if (!customer.has_purchased) {
    baseUpdates.has_purchased = true
  }

  // 2. Check N-tier upgrades
  let tierChanged = false
  const currentIdx = config.tiers.findIndex(t => t.slug === customer.loyalty_stage)
  for (let i = Math.max(currentIdx, 0) + 1; i < config.tiers.length; i++) {
    const tier = config.tiers[i]
    if (!tier.upgrade_trigger) continue
    if (shouldUpgrade(customer, tier.upgrade_trigger, newSpendTotal, isDeposit)) {
      baseUpdates.loyalty_stage = tier.slug
      baseUpdates.cashback_rate = tier.cashback_rate
      tierChanged = true
      results.push(`Upgraded to ${tier.slug} at ${tier.cashback_rate}%`)
    } else {
      break
    }
  }

  await adminSupabase.from('customers').update(baseUpdates).eq('id', customerId)

  // 3. Referral activation
  const { data: referralRow } = await adminSupabase
    .from('referrals')
    .select('*')
    .eq('referred_customer_id', customerId)
    .eq('status', 'pending')
    .single()

  if (referralRow && shouldUpgrade(
    { ...customer, has_purchased: true, total_real_spend: newSpendTotal },
    config.referrals.activation_trigger,
    newSpendTotal
  )) {
    const commissionExpires = new Date()
    commissionExpires.setDate(commissionExpires.getDate() + config.referrals.referrer_commission_duration_days)

    await adminSupabase
      .from('referrals')
      .update({
        status: 'activated',
        activated_at: new Date().toISOString(),
        commission_expires_at: commissionExpires.toISOString(),
      })
      .eq('id', referralRow.id)

    const { data: referrer } = await adminSupabase
      .from('customers')
      .select('referral_count, cashback_rate')
      .eq('id', referralRow.referrer_customer_id)
      .single()

    if (referrer) {
      const newCount = (referrer.referral_count || 0) + 1
      const currentRate = Number(referrer.cashback_rate || getReferralUnlockTier(config)?.cashback_rate || config.tiers[0].cashback_rate)
      const newRate = Math.min(
        currentRate + config.referrals.referrer_cashback_bonus_per_ref,
        config.referrals.referrer_cashback_cap
      )

      await adminSupabase
        .from('customers')
        .update({ referral_count: newCount, cashback_rate: newRate })
        .eq('id', referralRow.referrer_customer_id)

      results.push(`Referral activated. Referrer now at ${newRate}% cashback`)

      fireWebhook(studioId, 'referral.activated', customerId, {
        referrer_customer_id: referralRow.referrer_customer_id,
        referrer_new_cashback_rate: newRate,
        referrer_referral_count: newCount,
      })

      // Send referral reward email to the referrer (fire-and-forget)
      const { data: referredCustomer } = await adminSupabase
        .from('customers')
        .select('name')
        .eq('id', customerId)
        .single()

      sendReferralReward(
        referralRow.referrer_customer_id,
        studioId,
        referredCustomer?.name ?? 'A friend',
        config.referrals.referrer_cashback_bonus_per_ref,
      )

      triggerPassUpdate(referralRow.referrer_customer_id)
    }
  }

  if (tierChanged) {
    const newTierSlug = baseUpdates.loyalty_stage as string
    const newTier = config.tiers.find(t => t.slug === newTierSlug)
    await adminSupabase.from('analytics_events').insert({
      studio_id: studioId,
      event_type: 'tier_change',
      customer_id: customerId,
      metadata: {
        from_tier: customer.loyalty_stage,
        to_tier: newTierSlug,
        to_tier_name: newTier?.name ?? newTierSlug,
        from_tier_name: config.tiers.find(t => t.slug === customer.loyalty_stage)?.name ?? customer.loyalty_stage,
        cashback_rate: newTier?.cashback_rate,
      },
    })

    fireWebhook(studioId, 'tier.upgraded', customerId, {
      from_tier: customer.loyalty_stage,
      to_tier: newTierSlug,
      to_tier_name: newTier?.name ?? newTierSlug,
      cashback_rate: newTier?.cashback_rate,
    })

    // Send tier upgrade email (fire-and-forget)
    sendTierUpgrade(customerId, studioId, customer.loyalty_stage, newTierSlug)
  }

  // 4. Check for active promotion
  const { data: activePromo } = await adminSupabase
    .from('member_promotions')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .single()

  // Expire time-based promotions that have passed
  let promo = activePromo
  if (promo && promo.expires_at && new Date(promo.expires_at) <= new Date()) {
    await expirePromotion(promo.id, customerId, promo.original_tier_slug, Number(promo.original_cashback_rate))
    results.push(`Promotion expired (time limit reached)`)
    fireWebhook(studioId, 'promotion.expired', customerId, { reason: 'time_limit' })
    promo = null
  }

  // Determine effective cashback rate
  let cashbackRate: number
  let promoApplied = false

  if (promo && promo.type === 'cashback_boost' && promo.cashback_rate != null) {
    cashbackRate = Number(promo.cashback_rate)
    promoApplied = true
  } else {
    cashbackRate = Number(customer.cashback_rate ?? config.tiers[0].cashback_rate)
  }

  // 5. Cashback calculation
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

    fireWebhook(studioId, 'balance.updated', customerId, {
      new_balance: newBalance,
      cashback_earned: cashbackAmount,
      cashback_rate: cashbackRate,
      promotion_applied: promoApplied,
    })
  }

  const transactedAt = new Date().toISOString()
  fireWebhook(studioId, 'transaction.created', customerId, {
    transaction_id: sourceTransactionId ?? `loyalink-${customerId}-${Date.now()}`,
    amount,
    amount_cents: Math.round(amount * 100),
    cash_amount: cashAmount ?? amount,
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
      loyalty_stage: baseUpdates.loyalty_stage ?? customer.loyalty_stage,
      balance: Number(customer.balance ?? 0) + cashbackAmount,
      cashback_rate: baseUpdates.cashback_rate ?? customer.cashback_rate,
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
    },
  })

  const tierUpgradeForMessage = tierChanged && baseUpdates.loyalty_stage
    ? (() => {
        const t = config.tiers.find(x => x.slug === baseUpdates.loyalty_stage)
        return t ? { name: t.name, cashbackRate: t.cashback_rate } : null
      })()
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

  // 6. Handle promotion usage decrement / expiry after transaction
  if (promo && promo.remaining_transactions != null) {
    const remaining = promo.remaining_transactions - 1
    if (remaining <= 0) {
      await expirePromotion(promo.id, customerId, promo.original_tier_slug, Number(promo.original_cashback_rate))
      results.push(`Promotion expired (usage limit reached)`)
      fireWebhook(studioId, 'promotion.expired', customerId, { reason: 'usage_limit' })
    } else {
      await adminSupabase
        .from('member_promotions')
        .update({ remaining_transactions: remaining })
        .eq('id', promo.id)
    }
  }

  // 5. Referral commission
  if (config.referrals.enabled) {
    const { data: activeReferral } = await adminSupabase
      .from('referrals')
      .select('*')
      .eq('referred_customer_id', customerId)
      .eq('status', 'activated')
      .gt('commission_expires_at', new Date().toISOString())
      .single()

    if (activeReferral) {
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

  // Build summary
  const updatedTierSlug = (baseUpdates.loyalty_stage as string) ?? customer.loyalty_stage
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

  return {
    success: true,
    results,
    summary: {
      tierUpgraded: tierChanged,
      previousTier: tierChanged ? {
        slug: customer.loyalty_stage,
        name: config.tiers.find(t => t.slug === customer.loyalty_stage)?.name ?? customer.loyalty_stage,
        cashbackRate,
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

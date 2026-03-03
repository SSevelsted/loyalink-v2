import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig, getReferralUnlockTier } from '@/types/database'
import type { RewardsConfig, UpgradeTriggerConfig } from '@/types/database'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export async function POST(request: NextRequest) {
  try {
    const { customerId, studioId, amount, isDeposit } = await request.json()

    if (!customerId || !studioId || amount == null) {
      return NextResponse.json({ error: 'customerId, studioId, and amount are required' }, { status: 400 })
    }

    // Auth check
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('studio_members')
      .select('id')
      .eq('studio_id', studioId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch customer
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (custErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Fetch rewards config
    const { data: studio } = await supabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single()

    const settings = studio?.settings as Record<string, unknown> | null
    const config: RewardsConfig = settings?.rewards_config
      ? migrateRewardsConfig(settings.rewards_config)
      : DEFAULT_REWARDS_CONFIG

    if (!config.enabled) {
      return NextResponse.json({ message: 'Rewards not enabled' })
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

    // 2. Check N-tier upgrades (sequential — stop at first unmet condition)
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
        break // sequential — stop at first unmet condition
      }
    }

    await supabase.from('customers').update(baseUpdates).eq('id', customerId)

    // 3. Referral activation (check on every transaction while referral is pending)
    const { data: referralRow } = await supabase
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

      await supabase
        .from('referrals')
        .update({
          status: 'activated',
          activated_at: new Date().toISOString(),
          commission_expires_at: commissionExpires.toISOString(),
        })
        .eq('id', referralRow.id)

      // Bump referrer's referral_count and cashback_rate
      const { data: referrer } = await supabase
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

        await supabase
          .from('customers')
          .update({ referral_count: newCount, cashback_rate: newRate })
          .eq('id', referralRow.referrer_customer_id)

        results.push(`Referral activated. Referrer now at ${newRate}% cashback`)

        triggerPassUpdate(referralRow.referrer_customer_id, studioId)
      }
    }

    if (tierChanged) {
      const newTierSlug = baseUpdates.loyalty_stage as string
      const newTier = config.tiers.find(t => t.slug === newTierSlug)
      await supabase.from('analytics_events').insert({
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
      triggerPassUpdate(customerId, studioId)
    }

    // 2. Cashback calculation
    // Re-fetch customer to get updated cashback_rate
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .select('cashback_rate, balance')
      .eq('id', customerId)
      .single()

    const cashbackRate = Number(updatedCustomer?.cashback_rate ?? config.tiers[0].cashback_rate)
    const cashbackAmount = amount * cashbackRate / 100

    if (cashbackAmount > 0) {
      await supabase.from('transactions').insert({
        customer_id: customerId,
        studio_id: studioId,
        type: 'cashback',
        amount: cashbackAmount,
        description: `${cashbackRate}% cashback on ${amount} kr purchase`,
      })

      const newBalance = Number(updatedCustomer?.balance ?? 0) + cashbackAmount
      await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId)

      triggerPassUpdate(customerId, studioId)

      results.push(`Cashback: ${cashbackAmount.toFixed(2)} kr (${cashbackRate}%)`)
    }

    // 3. Referral commission
    if (config.referrals.enabled) {
      const { data: activeReferral } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_customer_id', customerId)
        .eq('status', 'activated')
        .gt('commission_expires_at', new Date().toISOString())
        .single()

      if (activeReferral) {
        const commission = amount * config.referrals.referrer_commission_rate / 100

        if (commission > 0) {
          // Create commission transaction for referrer
          await supabase.from('transactions').insert({
            customer_id: activeReferral.referrer_customer_id,
            studio_id: studioId,
            type: 'referral_commission',
            amount: commission,
            description: `${config.referrals.referrer_commission_rate}% commission from referral`,
            source_customer_id: customerId,
          })

          // Update referrer balance
          const { data: referrer } = await supabase
            .from('customers')
            .select('balance')
            .eq('id', activeReferral.referrer_customer_id)
            .single()

          if (referrer) {
            await supabase
              .from('customers')
              .update({ balance: Number(referrer.balance) + commission })
              .eq('id', activeReferral.referrer_customer_id)
          }

          // Update total commission earned on referral
          await supabase
            .from('referrals')
            .update({
              total_commission_earned: Number(activeReferral.total_commission_earned || 0) + commission,
            })
            .eq('id', activeReferral.id)

          results.push(`Commission: ${commission.toFixed(2)} kr to referrer`)
        }
      }
    }

    return NextResponse.json({ success: true, results })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

function triggerPassUpdate(customerId: string, studioId: string) {
  // Fire and forget - push update to wallet pass
  fetch(`${PASS_SERVICE_URL}/api/push/customer/${customerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studioId }),
  }).catch(() => {})
}

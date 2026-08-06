import { adminSupabase } from '@/lib/studio-access'
import { passServiceFetch } from '@/lib/pass-service'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG, type RewardsConfig } from '@/types/database'

/**
 * Manual member-admin writes shared by the external v1 API routes and the embed
 * routes. Both surfaces need identical behaviour — validate against the studio's
 * rewards_config, update the customer, emit the `tier_change` analytics event
 * (which the Tier History card reads), and push a wallet-pass refresh. Keeping
 * this in one place stops the two entry points from drifting (the full-app
 * dashboard's direct-update path, for instance, skips the analytics event).
 */

export class MemberAdminError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'MemberAdminError'
    this.status = status
  }
}

async function loadRewardsConfig(studioId: string): Promise<RewardsConfig> {
  const { data: studio } = await adminSupabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()
  const settings = studio?.settings as Record<string, unknown> | null
  return settings?.rewards_config ? migrateRewardsConfig(settings.rewards_config) : DEFAULT_REWARDS_CONFIG
}

type ChangeTierInput = {
  studioId: string
  customerId: string
  tierSlug: string
  cashbackRate?: number | null
  source?: string
}

export async function changeTier(input: ChangeTierInput): Promise<{ tier_slug: string; cashback_rate: number }> {
  const { studioId, customerId, tierSlug, cashbackRate, source = 'api' } = input

  if (!tierSlug) throw new MemberAdminError('tier_slug is required', 400)

  const { data: customer } = await adminSupabase
    .from('customers')
    .select('id, loyalty_stage, studio_id')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .single()
  if (!customer) throw new MemberAdminError('Member not found', 404)

  const config = await loadRewardsConfig(studioId)
  const tier = config.tiers.find((t) => t.slug === tierSlug)
  if (!tier) throw new MemberAdminError(`Tier "${tierSlug}" not found in rewards config`, 400)

  const previousTier = customer.loyalty_stage
  const newCashbackRate = cashbackRate ?? tier.cashback_rate

  await adminSupabase
    .from('customers')
    .update({ loyalty_stage: tierSlug, cashback_rate: newCashbackRate })
    .eq('id', customerId)

  await adminSupabase.from('analytics_events').insert({
    studio_id: studioId,
    event_type: 'tier_change',
    customer_id: customerId,
    metadata: {
      from_tier: previousTier,
      to_tier: tierSlug,
      to_tier_name: tier.name,
      cashback_rate: newCashbackRate,
      source,
    },
  })

  void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})

  return { tier_slug: tierSlug, cashback_rate: newCashbackRate }
}

type AdjustBalanceInput = {
  studioId: string
  customerId: string
  type: 'credit' | 'debit'
  amount: number
  description?: string | null
  createdBy?: string
}

export async function adjustBalance(input: AdjustBalanceInput): Promise<{ balance: number }> {
  const { studioId, customerId, type, amount, description, createdBy = 'api' } = input

  if (!type || !['credit', 'debit'].includes(type)) {
    throw new MemberAdminError('type must be "credit" or "debit"', 400)
  }
  if (typeof amount !== 'number' || amount <= 0) {
    throw new MemberAdminError('amount must be a positive number', 400)
  }

  const { data: customer } = await adminSupabase
    .from('customers')
    .select('id, balance, studio_id')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .single()
  if (!customer) throw new MemberAdminError('Member not found', 404)

  const balanceChange = type === 'credit' ? amount : -amount
  const newBalance = Number(customer.balance) + balanceChange
  if (newBalance < 0) throw new MemberAdminError('Insufficient balance', 400)

  await adminSupabase.from('transactions').insert({
    customer_id: customerId,
    studio_id: studioId,
    type: type === 'credit' ? 'adjustment' : 'debit',
    amount: type === 'credit' ? amount : -amount,
    description: description || `${createdBy} ${type}`,
    created_by: createdBy,
  })

  await adminSupabase.from('customers').update({ balance: newBalance }).eq('id', customerId)

  void passServiceFetch(`/api/push/customer/${customerId}`, { method: 'POST' }).catch(() => {})

  return { balance: newBalance }
}

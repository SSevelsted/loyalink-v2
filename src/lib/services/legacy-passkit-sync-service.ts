import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { adminSupabase } from '@/lib/studio-access'
import {
  syncPasskitMemberPoints,
  type PasskitMemberSyncResult,
} from '@/lib/services/passkit-rest-service'

type LegacyLoyaltyMetadata = {
  legacy_studio_id?: string
  legacy_customer_id?: string
  legacy_member_id?: string
  legacy_passkit_id?: string | null
}

type SyncInput = {
  customerId: string
  studioId?: string
  balance?: number
  totalSpend?: number
  cashbackRate?: number
  transaction?: {
    amount: number
    cashAmount?: number
    cashbackEarned: number
    isDeposit?: boolean
    currency?: string
  }
}

type SyncResult =
  | { status: 'skipped'; reason: 'not_legacy' | 'missing_mapping' | 'not_configured' }
  | {
      status: 'synced'
      legacyCustomerId: string
      passRowsUpdated: number
      passkit: PasskitMemberSyncResult
    }
  | { status: 'failed'; error: string }

type LegacyClient = NonNullable<ReturnType<typeof createLegacyClient>>

const PROVIDER = 'passkit_lovable'

export async function syncLegacyPasskitCustomer(input: SyncInput): Promise<SyncResult> {
  try {
    const legacyClient = createLegacyClient()
    if (!legacyClient) return { status: 'skipped', reason: 'not_configured' }

    const { data: customer, error: customerError } = await adminSupabase
      .from('customers')
      .select('id, studio_id, name, balance, cashback_rate, total_real_spend, pass_provider, metadata, currency')
      .eq('id', input.customerId)
      .single()

    if (customerError || !customer) {
      return { status: 'failed', error: customerError?.message ?? 'Customer not found' }
    }

    const mapping = await resolveLegacyMapping(customer.id, customer.metadata)
    if (!mapping.legacyStudioId || !mapping.legacyCustomerId) {
      const isLegacy = customer.pass_provider === 'legacy_passkit'
      return { status: 'skipped', reason: isLegacy ? 'missing_mapping' : 'not_legacy' }
    }

    const now = new Date().toISOString()
    const nextBalance = roundMoney(input.balance ?? Number(customer.balance ?? 0))
    const nextTotalSpend = roundMoney(input.totalSpend ?? Number(customer.total_real_spend ?? 0))
    const nextCashbackRate = toLegacyCashbackRate(input.cashbackRate ?? Number(customer.cashback_rate ?? 0))

    const { data: legacyCustomer, error: updateError } = await legacyClient
      .from('customers')
      .update({
        balance: nextBalance,
        total_spend: nextTotalSpend,
        cashback_rate: nextCashbackRate,
        updated_at: now,
        last_activity_at: now,
      })
      .eq('id', mapping.legacyCustomerId)
      .eq('studio_id', mapping.legacyStudioId)
      .select('id, member_id, currency, contact_id, location, ghl_api')
      .maybeSingle()

    if (updateError) return { status: 'failed', error: updateError.message }
    if (!legacyCustomer) return { status: 'failed', error: 'Legacy customer not found' }

    if (input.transaction) {
      const amount = roundMoney(input.transaction.amount)
      const cashAmount = roundMoney(input.transaction.cashAmount ?? input.transaction.amount)
      const balanceUsed = Math.max(0, roundMoney(amount - cashAmount))
      const cashbackEarned = roundMoney(input.transaction.cashbackEarned)
      await legacyClient.from('transactions').insert({
        customer_id: mapping.legacyCustomerId,
        studio_id: mapping.legacyStudioId,
        type: 'purchase',
        total_amount: amount,
        balance_change: roundMoney(cashbackEarned - balanceUsed),
        note: `${input.transaction.isDeposit ? 'Deposit' : 'Purchase'} - used balance: ${formatLegacyAmount(balanceUsed)}, earned: ${formatLegacyAmount(cashbackEarned)}`,
        is_deposit: !!input.transaction.isDeposit,
        currency: input.transaction.currency ?? legacyCustomer.currency ?? customer.currency ?? 'DKK',
        contact_id: legacyCustomer.contact_id,
        location: legacyCustomer.location,
        ghl_api: legacyCustomer.ghl_api,
      })
    }

    const passRowsUpdated = await touchLegacyWalletPasses(legacyClient, mapping.legacyCustomerId, {
      balance: nextBalance,
      total_spend: nextTotalSpend,
      cashback_rate: nextCashbackRate,
      synced_at: now,
      source: 'loyalink_v2',
    })
    const passkitMemberId = mapping.legacyMemberId ?? legacyCustomer.member_id
    const balanceText = formatLegacyAmount(nextBalance)
    const cashbackRatePercent = roundMoney(nextCashbackRate * 100)
    const passkit = await syncPasskitMemberPoints({
      memberId: passkitMemberId,
      points: nextBalance,
      dynamicData: {
        balance: nextBalance,
        balanceText,
        balance_formatted: balanceText,
        balance_text: balanceText,
        cashbackBalance: nextBalance,
        cashback_balance: nextBalance,
        current_balance: nextBalance,
        loyalty_balance: nextBalance,
        points: nextBalance,
        points_formatted: balanceText,
        total_spend: nextTotalSpend,
        totalSpend: nextTotalSpend,
        cashback_rate: nextCashbackRate,
        cashbackRate: nextCashbackRate,
        cashback_rate_percent: cashbackRatePercent,
        cashbackRatePercent,
        currency: legacyCustomer.currency ?? customer.currency ?? 'DKK',
        last_activity_at: now,
        lastActivityAt: now,
        synced_from: 'loyalink_v2',
      },
    })

    await logLegacySync(input.studioId ?? customer.studio_id, customer.id, {
      status: 'synced',
      legacy_studio_id: mapping.legacyStudioId,
      legacy_customer_id: mapping.legacyCustomerId,
      legacy_member_id: passkitMemberId,
      legacy_passkit_id: mapping.legacyMemberId,
      pass_rows_updated: passRowsUpdated,
      passkit,
    })

    return { status: 'synced', legacyCustomerId: mapping.legacyCustomerId, passRowsUpdated, passkit }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Legacy sync failed'
    await logLegacySync(input.studioId ?? null, input.customerId, {
      status: 'failed',
      error: message,
    })
    return { status: 'failed', error: message }
  }
}

function createLegacyClient() {
  const legacyUrl = process.env.LEGACY_LOYALTY_SUPABASE_URL
  const legacyServiceRoleKey = process.env.LEGACY_LOYALTY_SERVICE_ROLE_KEY
  if (!legacyUrl || !legacyServiceRoleKey) return null
  return createSupabaseClient(legacyUrl, legacyServiceRoleKey)
}

async function resolveLegacyMapping(customerId: string, metadata: unknown) {
  const { data: link } = await adminSupabase
    .from('legacy_loyalty_links')
    .select('legacy_studio_id, legacy_customer_id, legacy_member_id, legacy_passkit_id')
    .eq('customer_id', customerId)
    .eq('provider', PROVIDER)
    .maybeSingle()

  if (link?.legacy_studio_id && link?.legacy_customer_id) {
    return {
      legacyStudioId: link.legacy_studio_id as string,
      legacyCustomerId: link.legacy_customer_id as string,
      legacyMemberId: (link.legacy_passkit_id ?? link.legacy_member_id) as string | null,
    }
  }

  const legacyMetadata = ((metadata as Record<string, unknown> | null)?.legacy_loyalty ?? {}) as LegacyLoyaltyMetadata
  return {
    legacyStudioId: legacyMetadata.legacy_studio_id,
    legacyCustomerId: legacyMetadata.legacy_customer_id,
    legacyMemberId: legacyMetadata.legacy_passkit_id ?? legacyMetadata.legacy_member_id,
  }
}

async function touchLegacyWalletPasses(
  legacyClient: LegacyClient,
  legacyCustomerId: string,
  snapshot: Record<string, unknown>,
) {
  const { data: passes } = await legacyClient
    .from('wallet_passes')
    .select('id, version')
    .eq('customer_id', legacyCustomerId)

  if (!passes?.length) return 0

  const now = new Date().toISOString()
  await Promise.all(
    passes.map((pass) =>
      legacyClient
        .from('wallet_passes')
        .update({
          version: Number(pass.version ?? 0) + 1,
          updated_at: now,
          last_value_snapshot: snapshot,
        })
        .eq('id', pass.id)
    )
  )

  return passes.length
}

async function logLegacySync(studioId: string | null, customerId: string, metadata: Record<string, unknown>) {
  if (!studioId) return
  await adminSupabase.from('audit_logs').insert({
    studio_id: studioId,
    action: 'legacy_loyalty.passkit_sync',
    actor_type: 'system',
    target_type: 'customer',
    target_id: customerId,
    metadata,
  })
}

function toLegacyCashbackRate(rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return rate > 1 ? roundMoney(rate / 100) : roundMoney(rate)
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

function formatLegacyAmount(value: number) {
  return value.toFixed(2).replace('.', ',')
}

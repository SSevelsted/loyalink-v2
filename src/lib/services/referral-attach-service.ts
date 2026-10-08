import { adminSupabase } from '@/lib/studio-access'
import { pushCustomerPass } from '@/lib/pass-push'
import { giftCounterEnabled } from '@/lib/gift-counter'
import { loadStudioRewardsConfig } from '@/lib/services/gift-counter-service'
import type { RewardsConfig } from '@/types/database'

/**
 * Attach a referrer to a member who already exists (POST
 * /api/v1/members/{id}/referral). For a friend whose card was made before the
 * giver's code was known.
 *
 * Writes one pending referral row, the same row createMember writes. It does
 * NOT credit a welcome bonus and does NOT change the member's tier or
 * cashback rate: the platform credits the friend itself. No webhook fires:
 * there is no referral.created event (referral.activated fires later, on the
 * friend's first qualifying transaction, as for any referral).
 *
 * Idempotent: the same referrer again returns the existing row.
 */

export class AttachReferralError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message)
    this.name = 'AttachReferralError'
  }
}

export type AttachedReferral = {
  id: string
  referrer_customer_id: string
  referred_customer_id: string
  referral_code: string
  status: string
  created_at: string
}

export type AttachReferralResult = { created: boolean; referral: AttachedReferral }

const REFERRAL_COLUMNS = 'id, referrer_customer_id, referred_customer_id, referral_code, status, created_at'

const digits = (phone: unknown) => String(phone ?? '').replace(/\D/g, '')
const lower = (email: unknown) => String(email ?? '').trim().toLowerCase()

async function existingReferralFor(customerId: string) {
  const { data } = await adminSupabase
    .from('referrals')
    .select(REFERRAL_COLUMNS)
    .eq('referred_customer_id', customerId)
    .maybeSingle()
  return (data as AttachedReferral | null) ?? null
}

/** Push the giver's pass so a gift counter on it refreshes. Only when the switch is on. */
export function pushGiverPass(referrerId: string, config: RewardsConfig) {
  if (!giftCounterEnabled(config)) return
  pushCustomerPass(referrerId)
}

export async function attachReferral(input: {
  studioId: string
  customerId: string
  referralCode: unknown
}): Promise<AttachReferralResult> {
  const { studioId, customerId } = input
  const code = typeof input.referralCode === 'string' ? input.referralCode.trim().toUpperCase() : ''
  if (!code) throw new AttachReferralError('referral_code is required', 400, 'referral_code_required')

  const config = await loadStudioRewardsConfig(studioId)
  if (!config.referrals.enabled) {
    throw new AttachReferralError('Referrals are disabled for this studio', 400, 'referrals_disabled')
  }

  const { data: member } = await adminSupabase
    .from('customers')
    .select('id, email, phone')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .maybeSingle()
  if (!member) throw new AttachReferralError('Member not found', 404, 'member_not_found')

  const { data: referrer } = await adminSupabase
    .from('customers')
    .select('id, email, phone')
    .eq('referral_code', code)
    .eq('studio_id', studioId)
    .maybeSingle()
  if (!referrer) throw new AttachReferralError('Referral code not found in this studio', 400, 'code_not_found')

  const sameEmail = !!lower(member.email) && lower(member.email) === lower(referrer.email)
  const samePhone = !!digits(member.phone) && digits(member.phone) === digits(referrer.phone)
  if (referrer.id === member.id || sameEmail || samePhone) {
    throw new AttachReferralError('A member cannot refer themselves', 400, 'self_referral')
  }

  const existing = await existingReferralFor(member.id)
  if (existing) {
    if (existing.referrer_customer_id === referrer.id) return { created: false, referral: existing }
    throw new AttachReferralError('Member already has a referrer', 409, 'already_referred')
  }

  // Pre-existing clients of the studio cannot be referred (same rule as signup).
  const blocked = [] as Array<{ column: 'email' | 'phone'; value: string }>
  if (member.email) blocked.push({ column: 'email', value: member.email as string })
  if (member.phone) blocked.push({ column: 'phone', value: member.phone as string })
  for (const { column, value } of blocked) {
    const { data: hit } = await adminSupabase
      .from('studio_pre_existing_clients')
      .select('id')
      .eq('studio_id', studioId)
      .eq(column, value)
      .limit(1)
      .maybeSingle()
    if (hit) throw new AttachReferralError('Member is a pre-existing client of the studio', 400, 'pre_existing_client')
  }

  const { data: inserted, error } = await adminSupabase
    .from('referrals')
    .insert({
      studio_id: studioId,
      referrer_customer_id: referrer.id,
      referred_customer_id: member.id,
      referral_code: code,
      status: 'pending',
    })
    .select(REFERRAL_COLUMNS)
    .single()

  if (error || !inserted) {
    // A concurrent request may have written the row first (UNIQUE referred_customer_id).
    const raced = await existingReferralFor(member.id)
    if (raced && raced.referrer_customer_id === referrer.id) return { created: false, referral: raced }
    if (raced) throw new AttachReferralError('Member already has a referrer', 409, 'already_referred')
    console.error('[referrals] attach insert failed', { studioId, customerId, referrerId: referrer.id, message: error?.message })
    throw new AttachReferralError('Failed to create referral', 500, 'insert_failed')
  }

  pushGiverPass(referrer.id as string, config)
  return { created: true, referral: inserted as AttachedReferral }
}

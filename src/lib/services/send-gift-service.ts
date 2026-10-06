import { adminSupabase } from '@/lib/studio-access'
import { hasPersonalDataAccess, memberLinkVersion } from '@/lib/customer-access'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import { deliverWebhookNow, studioHasWebhookFor } from '@/lib/services/webhook-service'
import {
  FRIEND_SENT_EVENT,
  SEND_GIFT_DAILY_LIMIT,
  buildFriendSentPayload,
  validateFriendInput,
  type FriendSentPayload,
  type SendGiftError,
} from '@/lib/send-gift'

/**
 * "Send a gift" from the member page (private view): the member enters a
 * friend's first name and phone. Loyalink creates no member for the friend.
 * It sends referral.friend_sent to the studio's webhooks (StreamInk), which
 * creates the lead and messages the friend.
 *
 * Auth: the same token the private member page holds (a full customer access
 * token or the member link token, see hasPersonalDataAccess). A pass-only
 * token is refused.
 */

/** analytics_events.event_type of a sent friend; the daily limit counts these. */
export const FRIEND_SENT_ANALYTICS = 'referral_friend_sent'

export type SendGiftResult =
  | { status: 200; sent: true; payload: FriendSentPayload }
  | {
      status: 400 | 401 | 404 | 409 | 429 | 502
      error: SendGiftError | 'unauthorized' | 'not_found' | 'referrals_disabled' | 'no_webhook' | 'daily_limit' | 'delivery_failed'
      message: string
    }

type Deliver = typeof deliverWebhookNow

export async function sendGiftToFriend(
  args: { memberId: string; token: string | null; firstName: unknown; phone: unknown; now?: Date },
  deps: { deliver?: Deliver } = {},
): Promise<SendGiftResult> {
  const deliver = deps.deliver ?? deliverWebhookNow
  const now = args.now ?? new Date()

  const select = 'id, member_id, studio_id, phone, referral_code, link_token_version, studios:studio_id(settings)'
  const { data: byMemberId } = await adminSupabase.from('customers').select(select).eq('member_id', args.memberId).maybeSingle()
  const customer = (byMemberId
    ?? (await adminSupabase.from('customers').select(select).eq('id', args.memberId).maybeSingle()).data) as
    | { id: string; member_id: string | null; studio_id: string; phone: string | null; referral_code: string | null; link_token_version?: number; studios: { settings: Record<string, unknown> | null } | null }
    | null
  if (!customer) return { status: 404, error: 'not_found', message: 'Member not found' }

  if (!hasPersonalDataAccess(args.token, customer.id, memberLinkVersion(customer))) {
    return { status: 401, error: 'unauthorized', message: 'Unauthorized' }
  }

  const input = validateFriendInput({ firstName: args.firstName, phone: args.phone }, customer.phone)
  if (!input.ok) {
    const message = input.error === 'self'
      ? "That is the member's own phone number"
      : input.error === 'invalid_phone' ? 'phone must be E.164, e.g. +4520123456' : 'firstName is required (max 60 characters)'
    return { status: 400, error: input.error, message }
  }

  const settings = customer.studios?.settings ?? {}
  const config = settings.rewards_config ? migrateRewardsConfig(settings.rewards_config) : DEFAULT_REWARDS_CONFIG
  if (!config.referrals.enabled) {
    return { status: 409, error: 'referrals_disabled', message: 'This studio has referrals turned off' }
  }

  if (!(await studioHasWebhookFor(customer.studio_id, FRIEND_SENT_EVENT))) {
    return {
      status: 409,
      error: 'no_webhook',
      message: `This studio has no webhook for ${FRIEND_SENT_EVENT}, so nobody would message the friend. Share the referral link instead.`,
    }
  }

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await adminSupabase
    .from('analytics_events')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('event_type', FRIEND_SENT_ANALYTICS)
    .gte('created_at', since)
  if ((recent?.length ?? 0) >= SEND_GIFT_DAILY_LIMIT) {
    return { status: 429, error: 'daily_limit', message: `At most ${SEND_GIFT_DAILY_LIMIT} friends in 24 hours` }
  }

  const payload = buildFriendSentPayload({ referrer: customer, friend: input.value, sentAt: now })
  const { delivered } = await deliver(customer.studio_id, FRIEND_SENT_EVENT, customer.id, payload)
  if (delivered === 0) {
    return { status: 502, error: 'delivery_failed', message: 'The studio did not receive the friend. Try again.' }
  }

  // Counts toward the daily limit. The friend's phone stays out of Loyalink.
  await adminSupabase.from('analytics_events').insert({
    studio_id: customer.studio_id,
    event_type: FRIEND_SENT_ANALYTICS,
    customer_id: customer.id,
    metadata: { friend_first_name: input.value.firstName },
  })

  return { status: 200, sent: true, payload }
}

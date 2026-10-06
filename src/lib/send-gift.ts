// "Send a gift" from the member page: the member enters a friend's first name
// and phone, and the studio's platform (StreamInk) gets a
// referral.friend_sent webhook. Loyalink creates no member for the friend.
// Pure functions only, so they are unit tested.

/** The webhook event a sent friend fires. */
export const FRIEND_SENT_EVENT = 'referral.friend_sent' as const

/** Friends one member may send in 24 hours. */
export const SEND_GIFT_DAILY_LIMIT = 10

export const FRIEND_FIRST_NAME_MAX = 60

export type SendGiftError = 'invalid_name' | 'invalid_phone' | 'self'

/**
 * A phone number as E.164 ("+4520123456"), or null when it is not one.
 * Spaces, dashes, dots and brackets are dropped; a leading 00 becomes +.
 * Needs the country code: the form always sends one.
 */
export function normalizeE164(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let s = raw.trim().replace(/[\s\-().]/g, '')
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null
}

const digits = (s: string) => s.replace(/\D/g, '')

/**
 * Is the friend's number the member's own? The member's stored phone may lack
 * the country code ("20 12 34 56"), so a stored number of 8+ digits also
 * matches the end of the friend's number.
 */
export function isSamePhone(friendE164: string, memberPhone: string | null | undefined): boolean {
  if (!memberPhone) return false
  const friend = digits(friendE164)
  let member = digits(memberPhone)
  if (memberPhone.trim().startsWith('00')) member = member.slice(2)
  if (!member) return false
  if (friend === member) return true
  return member.length >= 8 && friend.endsWith(member)
}

export type FriendInput = { firstName: string; phone: string }

export function validateFriendInput(
  input: { firstName?: unknown; phone?: unknown },
  memberPhone: string | null | undefined,
): { ok: true; value: FriendInput } | { ok: false; error: SendGiftError } {
  const firstName = typeof input.firstName === 'string' ? input.firstName.trim().replace(/\s+/g, ' ') : ''
  if (!firstName || firstName.length > FRIEND_FIRST_NAME_MAX) return { ok: false, error: 'invalid_name' }
  const phone = normalizeE164(input.phone)
  if (!phone) return { ok: false, error: 'invalid_phone' }
  if (isSamePhone(phone, memberPhone)) return { ok: false, error: 'self' }
  return { ok: true, value: { firstName, phone } }
}

/** The data of the referral.friend_sent webhook (the envelope adds event, studio_id, customer_id, timestamp). */
export type FriendSentPayload = {
  referrer_member_id: string
  referrer_referral_code: string | null
  friend_first_name: string
  /** E.164 */
  friend_phone: string
  /** ISO time */
  sent_at: string
}

export function buildFriendSentPayload(args: {
  referrer: { id: string; member_id?: string | null; referral_code?: string | null }
  friend: FriendInput
  sentAt: Date
}): FriendSentPayload {
  return {
    referrer_member_id: args.referrer.member_id || args.referrer.id,
    referrer_referral_code: args.referrer.referral_code ?? null,
    friend_first_name: args.friend.firstName,
    friend_phone: args.friend.phone,
    sent_at: args.sentAt.toISOString(),
  }
}

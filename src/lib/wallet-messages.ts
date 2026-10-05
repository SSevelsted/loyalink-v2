import { formatAmount, getCurrencyConfig } from '@/lib/currency'
import { migrateRewardsConfig, parseRewardsNumber } from '@/types/database'

// Pure helpers for wallet-pass messages (campaigns, the per-member API).
// No database access here, so the tests run without Supabase.

/** Max ids per `.in()` filter: keeps the PostgREST URL short and each page under the 1000-row cap. */
export const IN_CHUNK_SIZE = 200

export function chunk<T>(items: readonly T[], size: number = IN_CHUNK_SIZE): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error(`chunk size must be a positive integer, got ${size}`)
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export const FRIEND_GIFT_TOKEN = '{friend_gift}'
export const FIRST_NAME_TOKEN = '{first_name}'

/** Campaign builder preset. {first_name} renders per member in pass-service, {friend_gift} once per send. */
export const GIFT_REMINDER_TEMPLATE =
  'Hi {first_name}! Know someone who should try us? Tap the gift link on your card and your friend gets {friend_gift} from you.'

/**
 * What a referred friend gets, as text ("100 kr", "15 € + 15% cashback"), or
 * null when the studio has not set a welcome bonus. Reads the stored
 * rewards_config, not the defaults: a studio with no config must not send a
 * gift text built from the 100 default.
 */
export function friendGiftText(settings: Record<string, unknown> | null | undefined): string | null {
  const raw = settings?.rewards_config as { referrals?: Record<string, unknown> } | undefined
  const rawReferrals = raw?.referrals
  if (!raw || !rawReferrals || typeof rawReferrals !== 'object') return null
  if (rawReferrals.enabled === false) return null

  const bonus = parseRewardsNumber(rawReferrals.friend_welcome_bonus, 0)
  if (!(bonus > 0)) return null

  const currency = typeof settings?.currency === 'string' && settings.currency ? settings.currency : 'kr'
  const amount = formatAmount(bonus, getCurrencyConfig(currency))

  // The migrated config syncs the friend rate to the friend tier, which is the rate the friend really gets.
  const rate = migrateRewardsConfig(raw).referrals.friend_cashback_rate
  return rate > 0 ? `${amount} + ${rate}% cashback` : amount
}

export type RenderResult = { ok: true; text: string } | { ok: false; error: string }

export const FRIEND_GIFT_MISSING_ERROR =
  'This message uses {friend_gift}, but the studio has no friend welcome bonus set. Set one under Rewards > Referrals, or remove {friend_gift} from the text.'

/**
 * Render {friend_gift} once for a whole send. A text with the token and no
 * configured amount is refused, so nobody gets a gift text without an amount.
 * Text without the token passes through unchanged.
 */
export function renderFriendGift(text: string, settings: Record<string, unknown> | null | undefined): RenderResult {
  if (!text.includes(FRIEND_GIFT_TOKEN)) return { ok: true, text }
  const gift = friendGiftText(settings)
  if (!gift) return { ok: false, error: FRIEND_GIFT_MISSING_ERROR }
  return { ok: true, text: text.split(FRIEND_GIFT_TOKEN).join(gift) }
}

export const WALLET_MESSAGE_MAX_BODY = 180
export const WALLET_MESSAGE_MAX_HEADER = 40
export const WALLET_MESSAGE_MAX_ID = 64

export type WalletMessageBody = { body: string; header?: string; message_id?: string }

/** Validate the body of POST /api/v1/members/{id}/wallet-message. */
export function parseWalletMessageBody(input: unknown): { ok: true; value: WalletMessageBody } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Body must be a JSON object' }
  const b = input as Record<string, unknown>

  if (typeof b.body !== 'string') return { ok: false, error: 'body is required (string)' }
  const body = b.body.trim()
  if (body.length < 1 || body.length > WALLET_MESSAGE_MAX_BODY) {
    return { ok: false, error: `body must be 1 to ${WALLET_MESSAGE_MAX_BODY} characters` }
  }

  let header: string | undefined
  if (b.header != null) {
    if (typeof b.header !== 'string') return { ok: false, error: 'header must be a string' }
    header = b.header.trim() || undefined
    if (header && header.length > WALLET_MESSAGE_MAX_HEADER) {
      return { ok: false, error: `header must be at most ${WALLET_MESSAGE_MAX_HEADER} characters` }
    }
  }

  let messageId: string | undefined
  if (b.message_id != null) {
    if (typeof b.message_id !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(b.message_id)) {
      return { ok: false, error: `message_id must be 1 to ${WALLET_MESSAGE_MAX_ID} characters: letters, digits, '.', '_' or '-'` }
    }
    messageId = b.message_id
  }

  return { ok: true, value: { body, ...(header ? { header } : {}), ...(messageId ? { message_id: messageId } : {}) } }
}

/** Hours between two wallet messages to the same member through the API. */
export const WALLET_MESSAGE_COOLDOWN_HOURS = 20

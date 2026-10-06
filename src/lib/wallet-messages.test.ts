// Wallet messages: {friend_gift} guard, chunking, the per-member API body,
// and the campaign audience helpers. Run with `npm test`.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  chunk,
  friendGiftText,
  FRIEND_GIFT_MISSING_ERROR,
  GIFT_REMINDER_TEMPLATE,
  parseWalletMessageBody,
  renderFriendGift,
} from './wallet-messages'
import { campaignFailedCount, campaignSentCount, pushSegmentFilter } from './campaign-audience'

const studioSettings = (referrals: Record<string, unknown> | null, currency: string | null = 'dkk') => ({
  ...(currency ? { currency } : {}),
  ...(referrals ? { rewards_config: { tiers: [{ slug: 'gold', name: 'Gold', cashback_rate: 15 }], referrals } } : {}),
})

describe('chunk', () => {
  it('splits into chunks of the given size, last one shorter', () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  })

  it('defaults to 200 per chunk (2,500 ids = 13 queries)', () => {
    const ids = Array.from({ length: 2500 }, (_, i) => `id${i}`)
    const parts = chunk(ids)
    assert.equal(parts.length, 13)
    assert.equal(parts[0].length, 200)
    assert.equal(parts[12].length, 100)
    assert.deepEqual(parts.flat(), ids)
  })

  it('returns no chunks for an empty list', () => {
    assert.deepEqual(chunk([]), [])
  })

  it('rejects a size below 1', () => {
    assert.throws(() => chunk([1], 0))
  })
})

describe('friendGiftText', () => {
  it('formats the welcome bonus with the studio currency and the friend rate', () => {
    const text = friendGiftText(studioSettings({ enabled: true, friend_welcome_bonus: 100, friend_tier_slug: 'gold', friend_cashback_rate: 15 }))
    assert.equal(text, '100 kr + 15% cashback')
  })

  it('uses the euro symbol for eur studios', () => {
    const text = friendGiftText(studioSettings({ enabled: true, friend_welcome_bonus: 15, friend_tier_slug: 'gold', friend_cashback_rate: 15 }, 'eur'))
    assert.equal(text, '15 € + 15% cashback')
  })

  it('is null when the studio has no rewards_config (the 100 default is not an amount)', () => {
    assert.equal(friendGiftText(studioSettings(null)), null)
    assert.equal(friendGiftText(null), null)
  })

  it('is null when the bonus is 0 or missing', () => {
    assert.equal(friendGiftText(studioSettings({ enabled: true, friend_welcome_bonus: 0 })), null)
    assert.equal(friendGiftText(studioSettings({ enabled: true })), null)
  })

  it('is null when referrals are off', () => {
    assert.equal(friendGiftText(studioSettings({ enabled: false, friend_welcome_bonus: 100 })), null)
  })
})

describe('renderFriendGift', () => {
  const configured = studioSettings({ enabled: true, friend_welcome_bonus: 100, friend_tier_slug: 'gold', friend_cashback_rate: 15 })

  it('renders every {friend_gift} once for the send', () => {
    const result = renderFriendGift('Your friend gets {friend_gift}. Yes, {friend_gift}!', configured)
    assert.deepEqual(result, { ok: true, text: 'Your friend gets 100 kr + 15% cashback. Yes, 100 kr + 15% cashback!' })
  })

  it('refuses a {friend_gift} text when no amount is set', () => {
    const result = renderFriendGift('Your friend gets {friend_gift}', studioSettings({ enabled: true, friend_welcome_bonus: 0 }))
    assert.deepEqual(result, { ok: false, error: FRIEND_GIFT_MISSING_ERROR })
  })

  it('passes text without the token through, even with no amount set', () => {
    assert.deepEqual(renderFriendGift('Hi {first_name}', null), { ok: true, text: 'Hi {first_name}' })
  })

  it('keeps {first_name} for pass-service to render per member', () => {
    const result = renderFriendGift(GIFT_REMINDER_TEMPLATE, configured)
    assert.ok(result.ok)
    assert.ok(result.text.includes('{first_name}'))
    assert.ok(!result.text.includes('{friend_gift}'))
  })
})

describe('GIFT_REMINDER_TEMPLATE', () => {
  it('uses both tokens, has no em dash and stays under 140 characters once rendered', () => {
    assert.ok(GIFT_REMINDER_TEMPLATE.includes('{first_name}'))
    assert.ok(GIFT_REMINDER_TEMPLATE.includes('{friend_gift}'))
    assert.ok(!GIFT_REMINDER_TEMPLATE.includes('—'))
    const rendered = GIFT_REMINDER_TEMPLATE
      .replace('{first_name}', 'Alexander')
      .replace('{friend_gift}', '150 kr + 15% cashback')
    assert.ok(rendered.length < 140, `${rendered.length} chars: ${rendered}`)
  })
})

describe('parseWalletMessageBody', () => {
  it('accepts body, header and message_id', () => {
    assert.deepEqual(parseWalletMessageBody({ body: ' Hi ', header: 'News', message_id: 'promo-1' }), {
      ok: true,
      value: { body: 'Hi', header: 'News', message_id: 'promo-1' },
    })
  })

  it('rejects a missing, empty or too long body', () => {
    assert.equal(parseWalletMessageBody({}).ok, false)
    assert.equal(parseWalletMessageBody({ body: '   ' }).ok, false)
    assert.equal(parseWalletMessageBody({ body: 'x'.repeat(181) }).ok, false)
    assert.equal(parseWalletMessageBody({ body: 'x'.repeat(180) }).ok, true)
  })

  it('rejects a header over 40 characters and a bad message_id', () => {
    assert.equal(parseWalletMessageBody({ body: 'Hi', header: 'x'.repeat(41) }).ok, false)
    assert.equal(parseWalletMessageBody({ body: 'Hi', message_id: 'has space' }).ok, false)
  })

  it('rejects a non-object body', () => {
    assert.equal(parseWalletMessageBody(null).ok, false)
    assert.equal(parseWalletMessageBody('hi').ok, false)
  })
})

describe('campaign counts and filter', () => {
  it('sent_count includes Google notified', () => {
    assert.equal(campaignSentCount({ apple: { sent: 4 }, google: { notified: 3 } }), 7)
    assert.equal(campaignFailedCount({ apple: { failed: 1 }, google: { failed: 2 } }), 3)
    assert.equal(campaignSentCount(null), 0)
  })

  it('an "all" send drops a leftover segment filter', () => {
    assert.deepEqual(pushSegmentFilter('all', { loyalty_stages: ['gold'] }), {})
  })

  it('a "customers" send keeps only the ids, a segment send drops them', () => {
    assert.deepEqual(pushSegmentFilter('customers', { customer_ids: ['a'], tags: ['x'] }), { customer_ids: ['a'] })
    assert.deepEqual(pushSegmentFilter('segment', { customer_ids: ['a'], tags: ['x'] }), { tags: ['x'] })
  })
})

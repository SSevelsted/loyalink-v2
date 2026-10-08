// "Send a gift" from the member page: validation, the referral.friend_sent
// payload, and the service against an in-memory database. Run with `npm test`.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, wireFake, type FakeSupabase } from '@/test/fake-supabase'
import { REWARDS_CONFIG, STUDIO_ID, customerRow } from '@/test/loyalty-fixtures'
import {
  SEND_GIFT_DAILY_LIMIT,
  buildFriendSentPayload,
  isSamePhone,
  normalizeE164,
  validateFriendInput,
} from '@/lib/send-gift'
import { WEBHOOK_EVENTS } from '@/lib/webhook-events'

type Service = typeof import('./send-gift-service')
type Webhooks = typeof import('./webhook-service')
type Access = typeof import('@/lib/customer-access')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: Service
let webhooks: Webhooks
let access: Access
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']

const NOW = new Date('2026-10-06T12:00:00.000Z')
const studios = { settings: { rewards_config: REWARDS_CONFIG, currency: 'EUR', language: 'en' } }

function seed(opts: { webhookEvents?: string[] | null; sentToday?: number; webhookUrl?: string } = {}): FakeSupabase {
  const fake = createFakeSupabase({
    customers: [
      customerRow('giver', { member_id: 'MEMBER01', phone: '+45 20 12 34 56', referral_code: 'GIVER123', link_token_version: 1, studios }),
    ],
    studio_webhooks: opts.webhookEvents === null
      ? []
      : [{ id: 'wh-1', studio_id: STUDIO_ID, url: opts.webhookUrl ?? 'https://hooks.test/streamink', active: true, events: opts.webhookEvents ?? ['member.created', 'referral.friend_sent'] }],
    analytics_events: Array.from({ length: opts.sentToday ?? 0 }, (_, i) => ({
      id: `ae-${i}`, studio_id: STUDIO_ID, customer_id: 'giver', event_type: 'referral_friend_sent', created_at: '2026-10-06T08:00:00.000Z',
    })),
  })
  wireFake(adminSupabase, fake)
  return fake
}

before(async () => {
  setTestEnv()
  process.env.CUSTOMER_ACCESS_SECRET ??= 'test-customer-access-secret'
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./send-gift-service')
  webhooks = await import('./webhook-service')
  access = await import('@/lib/customer-access')
  originalFrom = adminSupabase.from
})

after(() => {
  adminSupabase.from = originalFrom
})

describe('send gift: phone and name validation', () => {
  it('normalizes E.164 and refuses a number without a country code', () => {
    assert.equal(normalizeE164('+45 20 12 34 56'), '+4520123456')
    assert.equal(normalizeE164('0046 70-123 45 67'), '+46701234567')
    assert.equal(normalizeE164('20123456'), null)
    assert.equal(normalizeE164('+0123456789'), null)
    assert.equal(normalizeE164('+45 12'), null)
    assert.equal(normalizeE164(4520123456), null)
  })

  it('refuses the member’s own phone, with or without the country code', () => {
    assert.equal(isSamePhone('+4520123456', '+45 20 12 34 56'), true)
    assert.equal(isSamePhone('+4520123456', '20 12 34 56'), true)
    assert.equal(isSamePhone('+4520123456', '004520123456'), true)
    assert.equal(isSamePhone('+4520123457', '+4520123456'), false)
    assert.equal(isSamePhone('+4520123456', null), false)
    assert.equal(isSamePhone('+4520123456', '123'), false)
  })

  it('validates the input', () => {
    assert.deepEqual(validateFriendInput({ firstName: '  Ana  ', phone: '+45 30 11 22 33' }, '+4520123456'), {
      ok: true, value: { firstName: 'Ana', phone: '+4530112233' },
    })
    assert.deepEqual(validateFriendInput({ firstName: '', phone: '+4530112233' }, null), { ok: false, error: 'invalid_name' })
    assert.deepEqual(validateFriendInput({ firstName: 'x'.repeat(61), phone: '+4530112233' }, null), { ok: false, error: 'invalid_name' })
    assert.deepEqual(validateFriendInput({ firstName: 'Ana', phone: '30112233' }, null), { ok: false, error: 'invalid_phone' })
    assert.deepEqual(validateFriendInput({ firstName: 'Ana', phone: '+4520123456' }, '20123456'), { ok: false, error: 'self' })
  })
})

describe('send gift: referral.friend_sent payload', () => {
  it('carries the member (long id + short id), the code, the friend and the time', () => {
    assert.deepEqual(
      buildFriendSentPayload({
        referrer: { id: 'uuid-1', member_id: 'MEMBER01', referral_code: 'GIVER123' },
        friend: { firstName: 'Ana', phone: '+4530112233' },
        sentAt: NOW,
      }),
      {
        referrer_member_id: 'uuid-1',
        referrer_short_member_id: 'MEMBER01',
        referrer_referral_code: 'GIVER123',
        friend_first_name: 'Ana',
        friend_phone: '+4530112233',
        sent_at: '2026-10-06T12:00:00.000Z',
      },
    )
  })

  it('an old row without member_id: the long id stays, the short id is null', () => {
    const p = buildFriendSentPayload({ referrer: { id: 'uuid-1' }, friend: { firstName: 'Ana', phone: '+4530112233' }, sentAt: NOW })
    assert.equal(p.referrer_member_id, 'uuid-1')
    assert.equal(p.referrer_short_member_id, null)
    assert.equal(p.referrer_referral_code, null)
  })

  it('is a registrable webhook event; an empty events list means every event', () => {
    assert.ok(WEBHOOK_EVENTS.some((e) => e.value === 'referral.friend_sent'))
    assert.equal(webhooks.webhookListensTo([], 'referral.friend_sent'), true)
    assert.equal(webhooks.webhookListensTo(['member.created'], 'referral.friend_sent'), false)
    assert.equal(webhooks.webhookListensTo(['referral.friend_sent'], 'referral.friend_sent'), true)
  })
})

describe('sendGiftToFriend', () => {
  const token = () => access.createCustomerAccessToken('giver', 3600)
  const okDeliver = () => {
    const sent: Array<{ event: string; customerId: string; data: Record<string, unknown> }> = []
    const deliver = async (_studio: string, event: string, customerId: string, data: Record<string, unknown>) => {
      sent.push({ event, customerId, data })
      return { matched: 1, delivered: 1 }
    }
    return { sent, deliver: deliver as unknown as NonNullable<Parameters<Service['sendGiftToFriend']>[1]>['deliver'] }
  }

  it('sends referral.friend_sent and creates no member', async () => {
    const fake = seed()
    const { sent, deliver } = okDeliver()
    const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: token(), firstName: 'Ana', phone: '+45 30 11 22 33', now: NOW }, { deliver })
    assert.equal(r.status, 200)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].event, 'referral.friend_sent')
    assert.equal(sent[0].customerId, 'giver')
    assert.equal(sent[0].data.referrer_member_id, 'giver')
    assert.equal(sent[0].data.referrer_short_member_id, 'MEMBER01')
    assert.equal(sent[0].data.friend_phone, '+4530112233')
    assert.equal(sent[0].data.sent_at, NOW.toISOString())
    assert.equal(fake.writes('customers').length, 0)
    assert.equal(fake.writes('referrals').length, 0)
    const logged = fake.rows('analytics_events')
    assert.equal(logged.length, 1)
    assert.equal(JSON.stringify(logged[0]).includes('30112233'), false, 'the friend phone is not stored')
  })

  it('refuses the member’s own phone', async () => {
    seed()
    const { sent, deliver } = okDeliver()
    const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: token(), firstName: 'Me', phone: '+4520123456', now: NOW }, { deliver })
    assert.equal(r.status, 400)
    assert.equal('error' in r && r.error, 'self')
    assert.equal(sent.length, 0)
  })

  it('refuses no token and a pass-only token', async () => {
    seed()
    const { deliver } = okDeliver()
    const none = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: null, firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(none.status, 401)
    const passOnly = access.createCustomerAccessToken('giver', 3600, { passOnly: true })
    const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: passOnly, firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(r.status, 401)
  })

  it('accepts the member link token', async () => {
    seed()
    const { deliver } = okDeliver()
    const link = access.createMemberLinkToken('giver', 1)
    const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: link, firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(r.status, 200)
  })

  it('409 when no webhook receives the event', async () => {
    seed({ webhookEvents: ['member.created', 'referral.activated'] })
    const { sent, deliver } = okDeliver()
    const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: token(), firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(r.status, 409)
    assert.equal('error' in r && r.error, 'no_webhook')
    assert.equal(sent.length, 0)
    seed({ webhookEvents: null })
    const none = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: token(), firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(none.status, 409)
  })

  it(`429 after ${SEND_GIFT_DAILY_LIMIT} friends in 24 hours`, async () => {
    seed({ sentToday: SEND_GIFT_DAILY_LIMIT })
    const { sent, deliver } = okDeliver()
    const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: token(), firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(r.status, 429)
    assert.equal(sent.length, 0)
    seed({ sentToday: SEND_GIFT_DAILY_LIMIT - 1 })
    const ok = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: token(), firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(ok.status, 200)
  })

  it('502 and nothing counted when the receiver did not take it', async () => {
    const fake = seed()
    const deliver = (async () => ({ matched: 1, delivered: 0 })) as unknown as NonNullable<Parameters<Service['sendGiftToFriend']>[1]>['deliver']
    const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: token(), firstName: 'Ana', phone: '+4530112233', now: NOW }, { deliver })
    assert.equal(r.status, 502)
    assert.equal(fake.rows('analytics_events').length, 0)
  })
})

describe('referral.friend_sent delivery retry', () => {
  it('a retry sends the exact same body, so sent_at does not change', async () => {
    // An IP literal: the SSRF check's DNS lookup answers without the network.
    seed({ webhookUrl: 'https://93.184.216.34/streamink' })
    const bodies: string[] = []
    const original = globalThis.fetch
    let calls = 0
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      bodies.push(String(init?.body))
      calls += 1
      return new Response('', { status: calls === 1 ? 500 : 200 })
    }) as typeof fetch
    try {
      const r = await service.sendGiftToFriend({ memberId: 'MEMBER01', token: access.createCustomerAccessToken('giver', 3600), firstName: 'Ana', phone: '+4530112233', now: NOW })
      assert.equal(r.status, 200)
      assert.equal(bodies.length, 2, 'one failed delivery, one retry')
      assert.equal(bodies[0], bodies[1])
      assert.equal(JSON.parse(bodies[1]).data.sent_at, NOW.toISOString())
    } finally {
      globalThis.fetch = original
    }
  })
})

// POST /api/v1/members/{id}/referral (attachReferral) and the "5 gifts to
// give" counter, against an in-memory database. Run with `npm test`.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { OTHER_STUDIO_ID, REWARDS_CONFIG, STUDIO_ID, customerRow, studioRow } from '@/test/loyalty-fixtures'
import { giftCounterFromTotal, giftCounterEnabled } from '@/lib/gift-counter'
import { migrateRewardsConfig } from '@/types/database'

type AttachService = typeof import('./referral-attach-service')
type GiftService = typeof import('./gift-counter-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let attach: AttachService
let gifts: GiftService
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

const ON = { ...REWARDS_CONFIG, referrals: { ...REWARDS_CONFIG.referrals, gift_counter_enabled: true } }

function referral(id: string, referrer: string, referred: string, fields: Row = {}): Row {
  return {
    id, studio_id: STUDIO_ID, referrer_customer_id: referrer, referred_customer_id: referred,
    referral_code: 'GIVER123', status: 'pending', created_at: '2026-09-30T10:00:00.000Z', ...fields,
  }
}

function seed(options: { config?: unknown; customers?: Row[]; referrals?: Row[]; preExisting?: Row[] } = {}): FakeSupabase {
  const fake = createFakeSupabase({
    studios: [studioRow(STUDIO_ID, options.config ?? ON), studioRow(OTHER_STUDIO_ID, ON)],
    customers: options.customers ?? [
      customerRow('giver', { referral_code: 'GIVER123', email: 'giver@example.com', phone: '+45 11 11 11 11' }),
      customerRow('other-giver', { referral_code: 'OTHER456' }),
      customerRow('friend', { email: 'friend@example.com', phone: '+4522222222', balance: 0, loyalty_stage: 'base', cashback_rate: 7.5 }),
      customerRow('outsider', { studio_id: OTHER_STUDIO_ID, referral_code: 'OUTSIDE1' }),
    ],
    referrals: options.referrals ?? [],
    transactions: [],
    studio_pre_existing_clients: options.preExisting ?? [],
  }, { unique: { referrals: [['referred_customer_id']] } })
  wireFake(adminSupabase, fake)
  return fake
}

const run = (customerId = 'friend', referralCode: unknown = 'giver123') =>
  attach.attachReferral({ studioId: STUDIO_ID, customerId, referralCode })

async function rejectsWith(promise: Promise<unknown>, status: number, code: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof attach.AttachReferralError, String(err))
    assert.equal(err.status, status)
    assert.equal(err.code, code)
    return true
  })
}

before(async () => {
  setTestEnv()
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  attach = await import('./referral-attach-service')
  gifts = await import('./gift-counter-service')
  originalFrom = adminSupabase.from
})

beforeEach(() => { fetchStub = stubFetch() })
afterEach(() => { fetchStub.restore() })
after(() => { adminSupabase.from = originalFrom })

describe('attachReferral', () => {
  it('writes one pending referral row, no welcome bonus, no tier or balance change', async () => {
    const fake = seed({ config: { ...ON, referrals: { ...ON.referrals, friend_welcome_bonus: 100, friend_tier_slug: 'loyalty_club' } } })

    const result = await run()

    assert.equal(result.created, true)
    assert.equal(result.referral.referrer_customer_id, 'giver')
    assert.equal(result.referral.referred_customer_id, 'friend')
    assert.equal(result.referral.referral_code, 'GIVER123')
    assert.equal(result.referral.status, 'pending')
    assert.equal(fake.rows('referrals').length, 1)
    assert.equal(fake.rows('transactions').length, 0, 'no welcome bonus')
    const friend = fake.row('customers', 'friend')
    assert.equal(friend.balance, 0)
    assert.equal(friend.loyalty_stage, 'base')
    assert.equal(friend.cashback_rate, 7.5)
    assert.ok(fetchStub.urls.includes('http://pass.test/api/push/customer/giver'), 'giver pass refreshed (counter on)')
  })

  it('is idempotent: the same referrer again returns the existing row', async () => {
    const fake = seed({ referrals: [referral('r-1', 'giver', 'friend')] })

    const result = await run()

    assert.equal(result.created, false)
    assert.equal(result.referral.id, 'r-1')
    assert.equal(fake.rows('referrals').length, 1)
  })

  it('409 when the member already has a different referrer', async () => {
    seed({ referrals: [referral('r-1', 'other-giver', 'friend', { referral_code: 'OTHER456' })] })
    await rejectsWith(run(), 409, 'already_referred')
  })

  it('rejects self-referral by id, email and phone', async () => {
    seed({
      customers: [
        customerRow('giver', { referral_code: 'GIVER123', email: 'giver@example.com', phone: '+45 11 11 11 11' }),
        customerRow('same-email', { email: 'GIVER@example.com' }),
        customerRow('same-phone', { phone: '+4511111111' }),
      ],
    })
    await rejectsWith(run('giver'), 400, 'self_referral')
    await rejectsWith(run('same-email'), 400, 'self_referral')
    await rejectsWith(run('same-phone'), 400, 'self_referral')
  })

  it('rejects a pre-existing client of the studio', async () => {
    seed({ preExisting: [{ id: 'pe-1', studio_id: STUDIO_ID, email: null, phone: '+4522222222' }] })
    await rejectsWith(run(), 400, 'pre_existing_client')
  })

  it('rejects a code from another studio, an unknown code, a missing code', async () => {
    seed()
    await rejectsWith(run('friend', 'OUTSIDE1'), 400, 'code_not_found')
    await rejectsWith(run('friend', 'NOPE0000'), 400, 'code_not_found')
    await rejectsWith(run('friend', null), 400, 'referral_code_required')
  })

  it('404 for a member of another studio', async () => {
    seed()
    await rejectsWith(run('outsider'), 404, 'member_not_found')
  })

  it('400 when the studio has referrals off', async () => {
    seed({ config: { ...ON, referrals: { ...ON.referrals, enabled: false } } })
    await rejectsWith(run(), 400, 'referrals_disabled')
  })

  it('does not push the giver pass when the gift counter is off', async () => {
    seed({ config: REWARDS_CONFIG })
    await run()
    assert.ok(!fetchStub.urls.some((u) => u.includes('/api/push/customer/')))
  })
})

describe('gift counter', () => {
  it('gifts_ready = 5 - (total mod 5), never 0', () => {
    const ready = [0, 1, 4, 5, 6, 9, 10, 11].map((n) => giftCounterFromTotal(n).gifts_ready)
    assert.deepEqual(ready, [5, 4, 1, 5, 4, 1, 5, 4])
    assert.equal(giftCounterFromTotal(7).gifts_given_total, 7)
  })

  it('switch defaults off and survives migrateRewardsConfig', () => {
    assert.equal(giftCounterEnabled(migrateRewardsConfig(REWARDS_CONFIG)), false)
    assert.equal(giftCounterEnabled(migrateRewardsConfig(ON)), true)
    assert.equal(giftCounterEnabled(migrateRewardsConfig({ ...ON, referrals: { ...ON.referrals, gift_counter_enabled: 'yes' } })), false)
  })

  it('counts every referral row as referrer (any status), per member; prize friends have no row', async () => {
    seed({
      referrals: [
        referral('r-1', 'giver', 'f1'),
        referral('r-2', 'giver', 'f2', { status: 'activated' }),
        referral('r-3', 'giver', 'f3', { status: 'expired' }),
        referral('r-4', 'other-giver', 'f4'),
        referral('r-5', 'giver', 'f5', { studio_id: OTHER_STUDIO_ID }),
      ],
    })

    const counters = await gifts.loadGiftCounters(STUDIO_ID, ['giver', 'other-giver', 'friend'])

    assert.deepEqual(counters.get('giver'), { gifts_given_total: 3, gifts_ready: 2 })
    assert.deepEqual(counters.get('other-giver'), { gifts_given_total: 1, gifts_ready: 4 })
    assert.deepEqual(counters.get('friend'), { gifts_given_total: 0, gifts_ready: 5 })
  })

  it('returns null per member when the switch is off, and giftFields maps to nulls', async () => {
    seed({ config: REWARDS_CONFIG, referrals: [referral('r-1', 'giver', 'f1')] })

    const counters = await gifts.loadGiftCounters(STUDIO_ID, ['giver'])

    assert.equal(counters.get('giver'), null)
    assert.deepEqual(gifts.giftFields(counters.get('giver')), { gifts_given_total: null, gifts_ready: null })
  })

  it('pages past the 1000-row cap', async () => {
    const rows = Array.from({ length: 1203 }, (_, i) => referral(`r-${String(i).padStart(5, '0')}`, 'giver', `f-${i}`))
    seed({ referrals: rows })

    const counters = await gifts.loadGiftCounters(STUDIO_ID, ['giver'])

    assert.deepEqual(counters.get('giver'), { gifts_given_total: 1203, gifts_ready: 2 })
  })
})

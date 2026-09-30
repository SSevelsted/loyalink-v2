// processTransaction against an in-memory database. Run with `npm test`.
//
// Owner rules under test (2026-09-29):
//   - Best deal: while a promotion runs, a purchase pays the higher of the
//     promotion's rate and the member's fallback rate.
//   - A permanent change during a promotion (tier upgrade) lands in the
//     promotion's fallback snapshot, so it survives the end.
// Referral activation and the referral bonus: referral-service.test.ts.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FakeSupabase, type Row } from '@/test/fake-supabase'
import {
  OTHER_STUDIO_ID,
  STUDIO_ID,
  customerRow,
  promotionRow,
  studioRow,
} from '@/test/loyalty-fixtures'

type Service = typeof import('./transaction-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: Service
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

function seed(tables: { customers: Row[]; member_promotions?: Row[]; studios?: Row[] }): FakeSupabase {
  const fake = createFakeSupabase({
    studios: tables.studios ?? [studioRow(STUDIO_ID)],
    customers: tables.customers,
    member_promotions: tables.member_promotions ?? [],
    referrals: [],
    transactions: [],
    analytics_events: [],
    studio_webhooks: [],
    wallet_passes: [],
    legacy_loyalty_links: [],
  })
  wireFake(adminSupabase, fake)
  return fake
}

function purchase(customerId: string, amount = 1000, studioId = STUDIO_ID) {
  return service.processTransaction({ customerId, studioId, amount })
}

function cashbackCredits(fake: FakeSupabase, customerId: string) {
  return fake.rows('transactions').filter((t) => t.customer_id === customerId && t.type === 'cashback')
}

before(async () => {
  setTestEnv()
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./transaction-service')
  originalFrom = adminSupabase.from

  // Setup guard: prove the service sees the patched client.
  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(purchase('nobody'), /fake-wired/, 'processTransaction does not use the patched adminSupabase')
})

beforeEach(() => {
  fetchStub = stubFetch()
})

afterEach(() => {
  fetchStub.restore()
})

after(() => {
  adminSupabase.from = originalFrom
})

describe('processTransaction: best deal while a promotion runs', () => {
  it('a boost below the fallback pays the fallback rate (Moa at Ink Nation)', async () => {
    const fake = seed({
      customers: [customerRow('moa', { loyalty_stage: 'loyalty_club', cashback_rate: 5 })],
      member_promotions: [promotionRow('promo', 'moa', {
        type: 'cashback_boost', cashback_rate: 5, original_tier_slug: 'loyalty_club', original_cashback_rate: 15,
      })],
    })

    const result = await purchase('moa')

    assert.equal(result.summary.cashbackRate, 15)
    assert.deepEqual(cashbackCredits(fake, 'moa').map((t) => t.amount), [150])
    // The row shows what she earns, for the wallet pass and StreamInk.
    assert.equal(fake.row('customers', 'moa').cashback_rate, 15)
  })

  it('a boost above the fallback pays the boost rate', async () => {
    const fake = seed({
      customers: [customerRow('c1', { cashback_rate: 20 })],
      member_promotions: [promotionRow('promo', 'c1', {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    })

    const result = await purchase('c1')

    assert.equal(result.summary.cashbackRate, 20)
    assert.deepEqual(cashbackCredits(fake, 'c1').map((t) => t.amount), [200])
    assert.equal(fake.row('customers', 'c1').cashback_rate, 20)
  })

  it('a tier_override below the member\'s own tier pays the own rate', async () => {
    const fake = seed({
      customers: [customerRow('c1', { loyalty_stage: 'loyalty_club', cashback_rate: 15 })],
      member_promotions: [promotionRow('promo', 'c1', {
        type: 'tier_override', tier_slug: 'loyalty_club', original_tier_slug: 'inner_circle', original_cashback_rate: 20,
      })],
    })

    const result = await purchase('c1')

    assert.equal(result.summary.cashbackRate, 20)
    assert.deepEqual(cashbackCredits(fake, 'c1').map((t) => t.amount), [200])
    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'loyalty_club', 'the override tier stays in force')
    assert.equal(row.cashback_rate, 20)
  })
})

describe('processTransaction: automatic tier upgrade during a promotion', () => {
  it('cashback_boost: the upgrade moves the fallback and the tier; the boost keeps paying', async () => {
    const fake = seed({
      customers: [customerRow('c1', { has_purchased: false, cashback_rate: 20 })],
      member_promotions: [promotionRow('promo', 'c1', {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    })

    const result = await purchase('c1')

    assert.equal(result.summary.tierUpgraded, true)
    assert.equal(result.summary.cashbackRate, 20)
    const promo = fake.row('member_promotions', 'promo')
    assert.equal(promo.status, 'active')
    assert.equal(promo.original_tier_slug, 'loyalty_club')
    assert.equal(promo.original_cashback_rate, 15)
    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 20)

    const [event] = fake.rows('analytics_events').filter((e) => e.event_type === 'tier_change')
    const metadata = event.metadata as Record<string, unknown>
    assert.equal(metadata.from_tier, 'base')
    assert.equal(metadata.to_tier, 'loyalty_club')
    assert.equal(metadata.cashback_rate, 15)
    assert.equal(metadata.source, 'purchase')
    assert.equal(metadata.deferred_by_promotion, 'promo')
  })

  it('cashback_boost: an upgrade on the boost\'s last purchase survives the expiry', async () => {
    const fake = seed({
      customers: [customerRow('c1', { has_purchased: false, cashback_rate: 20 })],
      member_promotions: [promotionRow('promo', 'c1', {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
        remaining_transactions: 1,
      })],
    })

    await purchase('c1')

    assert.equal(fake.row('member_promotions', 'promo').status, 'expired')
    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 15)
  })

  it('a promotion past its end date ends first, so the upgrade in the same purchase is kept', async () => {
    const fake = seed({
      customers: [customerRow('c1', { has_purchased: false, cashback_rate: 20 })],
      member_promotions: [promotionRow('promo', 'c1', {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
        expires_at: '2026-01-01T00:00:00.000Z',
      })],
    })

    const result = await purchase('c1')

    assert.equal(fake.row('member_promotions', 'promo').status, 'expired')
    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 15)
    // The ended boost no longer pays. Like any upgrading purchase, this one
    // earns the rate in force before it.
    assert.equal(result.summary.cashbackRate, 7.5)
  })

  it('tier_override: the upgrade starts from the member\'s own tier and waits behind the override', async () => {
    const fake = seed({
      customers: [customerRow('c1', { has_purchased: false, loyalty_stage: 'inner_circle', cashback_rate: 20 })],
      member_promotions: [promotionRow('promo', 'c1', {
        type: 'tier_override', tier_slug: 'inner_circle', original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    })

    const result = await purchase('c1')

    assert.equal(result.summary.tierUpgraded, true)
    const promo = fake.row('member_promotions', 'promo')
    assert.equal(promo.original_tier_slug, 'loyalty_club')
    assert.equal(promo.original_cashback_rate, 15)
    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'inner_circle', 'the override stays in force')
    assert.equal(row.cashback_rate, 20)
    assert.equal(result.summary.cashbackRate, 20)
  })

  it('no promotion: the upgrade writes the new tier and rate to the member', async () => {
    const fake = seed({ customers: [customerRow('c1', { has_purchased: false })] })

    const result = await purchase('c1')

    assert.equal(result.summary.tierUpgraded, true)
    // The upgrading purchase earns the rate in force before it.
    assert.equal(result.summary.cashbackRate, 7.5)
    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 15)
    assert.equal(row.has_purchased, true)
    assert.equal(row.total_real_spend, 1000)
  })
})

describe('processTransaction: studio scope', () => {
  it('rejects a member of another studio and writes nothing', async () => {
    const fake = seed({
      studios: [studioRow(STUDIO_ID), studioRow(OTHER_STUDIO_ID)],
      customers: [customerRow('c1', { studio_id: OTHER_STUDIO_ID })],
    })

    await assert.rejects(purchase('c1'), (err: unknown) => err instanceof service.TransactionError && err.status === 404)
    assert.equal(fake.calls.filter((c) => c.op !== 'select').length, 0)
  })
})

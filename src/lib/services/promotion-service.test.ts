// applyPromotion against an in-memory database. Run with `npm test`.
//
// Best deal (owner rule 2026-09-29): the customer row shows the higher of the
// promotion's rate and the member's own rate, because that is what purchases
// pay and what the wallet pass and StreamInk read.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { STUDIO_ID, customerRow, promotionRow, studioRow } from '@/test/loyalty-fixtures'

type Service = typeof import('./promotion-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: Service
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

function seed(customers: Row[], promotions: Row[] = []): FakeSupabase {
  const fake = createFakeSupabase({
    studios: [studioRow(STUDIO_ID)],
    customers,
    member_promotions: promotions,
  })
  wireFake(adminSupabase, fake)
  return fake
}

function apply(input: Partial<Parameters<Service['applyPromotion']>[0]> & Pick<Parameters<Service['applyPromotion']>[0], 'type'>) {
  return service.applyPromotion({
    studioId: STUDIO_ID,
    customerId: 'c1',
    durationType: 'unlimited',
    durationValue: 1,
    ...input,
  })
}

before(async () => {
  setTestEnv()
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./promotion-service')
  originalFrom = adminSupabase.from

  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(apply({ type: 'cashback_boost', cashbackRate: 20 }), /fake-wired/,
    'applyPromotion does not use the patched adminSupabase')
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

describe('applyPromotion', () => {
  it('cashback_boost below the member\'s own rate: the row keeps the own rate', async () => {
    const fake = seed([customerRow('c1', { loyalty_stage: 'loyalty_club', cashback_rate: 15 })])

    const promo = await apply({ type: 'cashback_boost', cashbackRate: 5 }) as Row

    const stored = fake.row('member_promotions', promo.id as string)
    assert.equal(stored.cashback_rate, 5)
    assert.equal(stored.original_tier_slug, 'loyalty_club')
    assert.equal(stored.original_cashback_rate, 15)
    assert.equal(fake.row('customers', 'c1').cashback_rate, 15)
  })

  it('cashback_boost above the member\'s own rate: the row shows the boost', async () => {
    const fake = seed([customerRow('c1')])

    await apply({ type: 'cashback_boost', cashbackRate: 20 })

    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'base')
    assert.equal(row.cashback_rate, 20)
  })

  it('tier_override to a lower tier: the override tier shows, the own rate is kept', async () => {
    const fake = seed([customerRow('c1', { loyalty_stage: 'inner_circle', cashback_rate: 20 })])

    await apply({ type: 'tier_override', tierSlug: 'loyalty_club' })

    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 20)
  })

  it('tier_override to a higher tier: the override tier and its rate show', async () => {
    const fake = seed([customerRow('c1')])

    await apply({ type: 'tier_override', tierSlug: 'inner_circle' })

    const row = fake.row('customers', 'c1')
    assert.equal(row.loyalty_stage, 'inner_circle')
    assert.equal(row.cashback_rate, 20)
  })

  it('tier_override to a tier the studio does not have: 400, nothing written', async () => {
    const fake = seed([customerRow('c1')])

    await assert.rejects(
      apply({ type: 'tier_override', tierSlug: 'no_such_tier' }),
      (err: unknown) => err instanceof service.PromotionError && err.status === 400,
    )
    assert.equal(fake.rows('member_promotions').length, 0)
    assert.equal(fake.row('customers', 'c1').loyalty_stage, 'base')
  })

  it('a second active promotion: 409', async () => {
    seed([customerRow('c1', { cashback_rate: 20 })], [promotionRow('p0', 'c1', {
      type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
    })])

    await assert.rejects(
      apply({ type: 'cashback_boost', cashbackRate: 25 }),
      (err: unknown) => err instanceof service.PromotionError && err.status === 409,
    )
  })
})

// changeTier against an in-memory database. Run with `npm test`.
//
// Global fetch is stubbed so the wallet-pass push never leaves the process.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FailRule, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { STUDIO_ID, customerRow, promotionRow, studioRow } from '@/test/loyalty-fixtures'

type Service = typeof import('./member-admin-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

const CUSTOMER_ID = 'customer-1'

let service: Service
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

function seed(
  customer: Row,
  promotion: Row | null = null,
  options: Parameters<typeof createFakeSupabase>[1] = {},
): FakeSupabase {
  const fake = createFakeSupabase({
    studios: [studioRow(STUDIO_ID)],
    customers: [customer],
    member_promotions: promotion ? [promotion] : [],
    analytics_events: [],
  }, options)
  wireFake(adminSupabase, fake)
  return fake
}

function tierEvents(fake: FakeSupabase) {
  return fake.rows('analytics_events')
    .filter((e) => e.event_type === 'tier_change')
    .map((e) => e.metadata as Record<string, unknown>)
}

before(async () => {
  setTestEnv()
  // Load studio-access before the service. With tsx the reverse order can give
  // the service its own adminSupabase instance, and the fake would never run.
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./member-admin-service')
  originalFrom = adminSupabase.from

  // Setup guard: prove the service sees the patched client.
  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(
    service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'base' }),
    /fake-wired/,
    'changeTier does not use the patched adminSupabase',
  )
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

describe('changeTier', () => {
  it('no active promotion: writes the new tier and tier rate to the customer', async () => {
    const fake = seed(customerRow(CUSTOMER_ID))

    const result = await service.changeTier({
      studioId: STUDIO_ID,
      customerId: CUSTOMER_ID,
      tierSlug: 'loyalty_club',
      source: 'api',
    })

    assert.deepEqual(result, {
      tier_slug: 'loyalty_club',
      cashback_rate: 15,
      effective_tier_slug: 'loyalty_club',
      effective_cashback_rate: 15,
      deferred_by_promotion: null,
    })
    assert.equal(fake.writes('member_promotions').length, 0)
    const row = fake.row('customers', CUSTOMER_ID)
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 15)

    const [metadata] = tierEvents(fake)
    assert.equal(metadata.from_tier, 'base')
    assert.equal(metadata.from_tier_name, 'Base')
    assert.equal(metadata.to_tier, 'loyalty_club')
    assert.equal(metadata.to_tier_name, 'Loyalty Club')
    assert.equal(metadata.cashback_rate, 15)
    assert.equal(metadata.effective_cashback_rate, 15)
    assert.equal(metadata.source, 'api')
    assert.equal('deferred_by_promotion' in metadata, false)

    assert.deepEqual(fetchStub.urls, [`http://pass.test/api/push/customer/${CUSTOMER_ID}`])
  })

  it('active cashback_boost: new tier becomes the fallback, tier moves now, boost rate stays', async () => {
    const fake = seed(
      customerRow(CUSTOMER_ID, { cashback_rate: 20 }),
      promotionRow('promo-boost', CUSTOMER_ID, {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      }),
    )

    const result = await service.changeTier({
      studioId: STUDIO_ID,
      customerId: CUSTOMER_ID,
      tierSlug: 'loyalty_club',
      source: 'embed',
    })

    assert.deepEqual(result, {
      tier_slug: 'loyalty_club',
      cashback_rate: 15,
      effective_tier_slug: 'loyalty_club',
      effective_cashback_rate: 20,
      deferred_by_promotion: 'promo-boost',
    })
    const promo = fake.row('member_promotions', 'promo-boost')
    assert.equal(promo.original_tier_slug, 'loyalty_club')
    assert.equal(promo.original_cashback_rate, 15)
    const row = fake.row('customers', CUSTOMER_ID)
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 20)

    const [metadata] = tierEvents(fake)
    assert.equal(metadata.deferred_by_promotion, 'promo-boost')
    assert.equal(metadata.promotion_type, 'cashback_boost')
    assert.equal(metadata.from_tier, 'base')
    assert.equal(metadata.cashback_rate, 15)
    assert.equal(metadata.effective_cashback_rate, 20)
    assert.equal(fetchStub.urls.length, 1)
  })

  it('active cashback_boost below the new tier rate: the member earns the new tier rate now', async () => {
    const fake = seed(
      customerRow(CUSTOMER_ID, { cashback_rate: 10 }),
      promotionRow('promo-boost', CUSTOMER_ID, {
        type: 'cashback_boost', cashback_rate: 10, original_tier_slug: 'base', original_cashback_rate: 7.5,
      }),
    )

    const result = await service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'inner_circle' })

    assert.equal(result.effective_cashback_rate, 20)
    assert.equal(result.deferred_by_promotion, 'promo-boost')
    assert.equal(fake.row('member_promotions', 'promo-boost').original_cashback_rate, 20)
    const row = fake.row('customers', CUSTOMER_ID)
    assert.equal(row.loyalty_stage, 'inner_circle')
    assert.equal(row.cashback_rate, 20)
  })

  it('active tier_override: the fallback changes, the override tier stays, the row shows the best rate', async () => {
    const fake = seed(
      customerRow(CUSTOMER_ID, { loyalty_stage: 'loyalty_club', cashback_rate: 15 }),
      promotionRow('promo-override', CUSTOMER_ID, {
        type: 'tier_override', tier_slug: 'loyalty_club', original_tier_slug: 'base', original_cashback_rate: 7.5,
      }),
    )

    const result = await service.changeTier({
      studioId: STUDIO_ID,
      customerId: CUSTOMER_ID,
      tierSlug: 'base',
      cashbackRate: 12,
      source: 'api',
    })

    assert.deepEqual(result, {
      tier_slug: 'base',
      cashback_rate: 12,
      effective_tier_slug: 'loyalty_club',
      effective_cashback_rate: 15,
      deferred_by_promotion: 'promo-override',
    })
    const promo = fake.row('member_promotions', 'promo-override')
    assert.equal(promo.original_tier_slug, 'base')
    assert.equal(promo.original_cashback_rate, 12)
    const row = fake.row('customers', CUSTOMER_ID)
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 15)

    const [metadata] = tierEvents(fake)
    assert.equal(metadata.deferred_by_promotion, 'promo-override')
    assert.equal(metadata.promotion_type, 'tier_override')
    assert.equal(metadata.from_tier, 'base')
    assert.equal(metadata.to_tier, 'base')
    assert.equal(metadata.effective_cashback_rate, 15)
    assert.equal(fetchStub.urls.length, 1)
  })

  it('active tier_override above the override rate: the row shows the new own rate', async () => {
    const fake = seed(
      customerRow(CUSTOMER_ID, { loyalty_stage: 'loyalty_club', cashback_rate: 15 }),
      promotionRow('promo-override', CUSTOMER_ID, {
        type: 'tier_override', tier_slug: 'loyalty_club', original_tier_slug: 'base', original_cashback_rate: 7.5,
      }),
    )

    const result = await service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'inner_circle' })

    assert.equal(result.effective_tier_slug, 'loyalty_club')
    assert.equal(result.effective_cashback_rate, 20)
    const row = fake.row('customers', CUSTOMER_ID)
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 20)
  })

  it('promotion ended between read and write: the change applies directly', async () => {
    // A concurrent expire ends the promotion and restores its fallback just
    // before the snapshot write.
    const fake = seed(
      customerRow(CUSTOMER_ID, { cashback_rate: 20 }),
      promotionRow('promo-boost', CUSTOMER_ID, {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      }),
      {
        beforeExecute: (call, tables) => {
          if (call.table !== 'member_promotions' || call.op !== 'update') return
          const promo = tables.member_promotions.find((p) => p.id === 'promo-boost')!
          if (promo.status !== 'active') return
          promo.status = 'expired'
          Object.assign(tables.customers.find((c) => c.id === CUSTOMER_ID)!, { loyalty_stage: 'base', cashback_rate: 7.5 })
        },
      },
    )

    const result = await service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' })

    assert.equal(result.deferred_by_promotion, null)
    assert.equal(result.effective_cashback_rate, 15)
    const row = fake.row('customers', CUSTOMER_ID)
    assert.equal(row.loyalty_stage, 'loyalty_club')
    assert.equal(row.cashback_rate, 15)
  })

  it('pushPass false: no wallet-pass push', async () => {
    seed(customerRow(CUSTOMER_ID))

    await service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'inner_circle', pushPass: false })

    assert.deepEqual(fetchStub.urls, [])
  })

  it('snapshot write error: throws 500 and leaves the customer untouched', async () => {
    const fail: FailRule[] = [{ table: 'member_promotions', op: 'update', message: 'boom' }]
    const fake = seed(
      customerRow(CUSTOMER_ID, { cashback_rate: 20 }),
      promotionRow('promo-boost', CUSTOMER_ID, {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      }),
      { fail },
    )

    await assert.rejects(
      service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' }),
      (err: unknown) => err instanceof service.MemberAdminError && err.status === 500,
    )
    assert.equal(fake.writes('customers').length, 0)
    assert.equal(fake.writes('analytics_events').length, 0)
  })

  it('customer write error: throws 500', async () => {
    seed(customerRow(CUSTOMER_ID), null, { fail: [{ table: 'customers', op: 'update', message: 'boom' }] })

    await assert.rejects(
      service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' }),
      (err: unknown) => err instanceof service.MemberAdminError && err.status === 500,
    )
  })

  it('event insert error: throws 500', async () => {
    seed(customerRow(CUSTOMER_ID), null, { fail: [{ table: 'analytics_events', op: 'insert', message: 'boom' }] })

    await assert.rejects(
      service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' }),
      (err: unknown) => err instanceof service.MemberAdminError && err.status === 500,
    )
  })

  it('unknown tier: 400', async () => {
    seed(customerRow(CUSTOMER_ID))

    await assert.rejects(
      service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'no_such_tier' }),
      (err: unknown) => err instanceof service.MemberAdminError && err.status === 400,
    )
  })
})

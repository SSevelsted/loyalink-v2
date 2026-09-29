// Unit tests for changeTier. Run with `npm test` (node:test + tsx).
//
// adminSupabase is replaced by an in-memory fake that records every query, and
// global fetch is stubbed so the wallet-pass push never leaves the process.
import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

type Filter = [column: string, value: unknown]
type Call = {
  table: string
  op: 'select' | 'update' | 'insert'
  payload?: unknown
  filters: Filter[]
}
type Result = { data: unknown; error: { message: string } | null }

type Fixture = {
  customer: { id: string; studio_id: string; loyalty_stage: string; cashback_rate: number }
  activePromo?: {
    id: string
    type: 'cashback_boost' | 'tier_override'
    cashback_rate: number | null
    original_tier_slug: string
  } | null
  /** False simulates a promotion that ended between the read and the snapshot write. */
  promoStillActive?: boolean
  errors?: { promoUpdate?: string; customerUpdate?: string; eventInsert?: string }
}

const STUDIO_ID = 'studio-1'
const CUSTOMER_ID = 'customer-1'

const REWARDS_CONFIG = {
  enabled: true,
  tiers: [
    { slug: 'base', name: 'Base', cashback_rate: 5, unlocks_referrals: true },
    { slug: 'loyalty_club', name: 'Loyalty Club', cashback_rate: 10, unlocks_referrals: false },
    { slug: 'vip', name: 'VIP', cashback_rate: 15, unlocks_referrals: false },
  ],
}

function createFakeDb(fixture: Fixture) {
  const calls: Call[] = []

  const resolve = (call: Call): Result => {
    const err = (message?: string) => (message ? { message } : null)
    if (call.table === 'customers' && call.op === 'select') return { data: fixture.customer, error: null }
    if (call.table === 'customers' && call.op === 'update') {
      return { data: null, error: err(fixture.errors?.customerUpdate) }
    }
    if (call.table === 'studios') return { data: { settings: { rewards_config: REWARDS_CONFIG } }, error: null }
    if (call.table === 'member_promotions' && call.op === 'select') {
      return { data: fixture.activePromo ?? null, error: null }
    }
    if (call.table === 'member_promotions' && call.op === 'update') {
      const matched = fixture.activePromo && fixture.promoStillActive !== false
      return {
        data: matched ? [{ id: fixture.activePromo!.id }] : [],
        error: err(fixture.errors?.promoUpdate),
      }
    }
    if (call.table === 'analytics_events') return { data: null, error: err(fixture.errors?.eventInsert) }
    throw new Error(`Unexpected query: ${call.op} ${call.table}`)
  }

  const from = (table: string) => {
    const call: Call = { table, op: 'select', filters: [] }
    calls.push(call)
    const builder = {
      select: () => builder,
      update: (payload: unknown) => {
        call.op = 'update'
        call.payload = payload
        return builder
      },
      insert: (payload: unknown) => {
        call.op = 'insert'
        call.payload = payload
        return builder
      },
      eq: (column: string, value: unknown) => {
        call.filters.push([column, value])
        return builder
      },
      single: async () => resolve(call),
      maybeSingle: async () => resolve(call),
      then: (onFulfilled: (r: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve()
          .then(() => resolve(call))
          .then(onFulfilled, onRejected),
    }
    return builder
  }

  const writes = (table: string) => calls.filter((c) => c.table === table && c.op !== 'select')
  return { from, calls, writes }
}

type Service = typeof import('./member-admin-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: Service
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
const originalFetch = globalThis.fetch
let pushes: string[] = []

function useFixture(fixture: Fixture) {
  const db = createFakeDb(fixture)
  adminSupabase.from = db.from as unknown as AdminClient['from']
  return db
}

before(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
  process.env.PASS_SERVICE_SECRET ??= 'test-pass-secret'
  process.env.NEXT_PUBLIC_PASS_SERVICE_URL = 'http://pass.test'

  // Load studio-access before the service. With tsx the reverse order can give
  // the service its own adminSupabase instance, and the fake would never run.
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./member-admin-service')
  originalFrom = adminSupabase.from

  // Setup guard: prove the service sees the patched client.
  adminSupabase.from = (() => {
    throw new Error('fake-wired')
  }) as unknown as AdminClient['from']
  await assert.rejects(
    service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'base' }),
    /fake-wired/,
    'changeTier does not use the patched adminSupabase',
  )
})

beforeEach(() => {
  pushes = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    pushes.push(String(input))
    return new Response('{}', { status: 200 })
  }) as typeof fetch
})

after(() => {
  adminSupabase.from = originalFrom
  globalThis.fetch = originalFetch
})

describe('changeTier', () => {
  it('no active promotion: writes the new tier and tier rate to the customer', async () => {
    const db = useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'base', cashback_rate: 5 },
      activePromo: null,
    })

    const result = await service.changeTier({
      studioId: STUDIO_ID,
      customerId: CUSTOMER_ID,
      tierSlug: 'loyalty_club',
      source: 'api',
    })

    assert.deepEqual(result, {
      tier_slug: 'loyalty_club',
      cashback_rate: 10,
      effective_tier_slug: 'loyalty_club',
      effective_cashback_rate: 10,
      deferred_by_promotion: null,
    })
    assert.equal(db.writes('member_promotions').length, 0)

    const [customerWrite] = db.writes('customers')
    assert.deepEqual(customerWrite.payload, { loyalty_stage: 'loyalty_club', cashback_rate: 10 })
    assert.deepEqual(customerWrite.filters, [['id', CUSTOMER_ID], ['studio_id', STUDIO_ID]])

    const [event] = db.writes('analytics_events')
    const metadata = (event.payload as { metadata: Record<string, unknown> }).metadata
    assert.equal((event.payload as { event_type: string }).event_type, 'tier_change')
    assert.equal(metadata.from_tier, 'base')
    assert.equal(metadata.to_tier, 'loyalty_club')
    assert.equal(metadata.cashback_rate, 10)
    assert.equal(metadata.effective_cashback_rate, 10)
    assert.equal('deferred_by_promotion' in metadata, false)

    assert.deepEqual(pushes, [`http://pass.test/api/push/customer/${CUSTOMER_ID}`])
  })

  it('active cashback_boost: new tier becomes the fallback, tier moves now, boost rate stays', async () => {
    const db = useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'base', cashback_rate: 20 },
      activePromo: { id: 'promo-boost', type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base' },
    })

    const result = await service.changeTier({
      studioId: STUDIO_ID,
      customerId: CUSTOMER_ID,
      tierSlug: 'loyalty_club',
      source: 'embed',
    })

    assert.deepEqual(result, {
      tier_slug: 'loyalty_club',
      cashback_rate: 10,
      effective_tier_slug: 'loyalty_club',
      effective_cashback_rate: 20,
      deferred_by_promotion: 'promo-boost',
    })

    const [snapshotWrite] = db.writes('member_promotions')
    assert.deepEqual(snapshotWrite.payload, { original_tier_slug: 'loyalty_club', original_cashback_rate: 10 })
    assert.deepEqual(snapshotWrite.filters, [['id', 'promo-boost'], ['status', 'active']])

    const [customerWrite] = db.writes('customers')
    assert.deepEqual(customerWrite.payload, { loyalty_stage: 'loyalty_club', cashback_rate: 20 })

    const metadata = (db.writes('analytics_events')[0].payload as { metadata: Record<string, unknown> }).metadata
    assert.equal(metadata.deferred_by_promotion, 'promo-boost')
    assert.equal(metadata.promotion_type, 'cashback_boost')
    assert.equal(metadata.from_tier, 'base')
    assert.equal(metadata.cashback_rate, 10)
    assert.equal(metadata.effective_cashback_rate, 20)

    assert.equal(pushes.length, 1)
  })

  it('active tier_override: only the fallback changes, the override stays on the customer', async () => {
    const db = useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'vip', cashback_rate: 15 },
      activePromo: { id: 'promo-override', type: 'tier_override', cashback_rate: null, original_tier_slug: 'base' },
    })

    const result = await service.changeTier({
      studioId: STUDIO_ID,
      customerId: CUSTOMER_ID,
      tierSlug: 'loyalty_club',
      cashbackRate: 12,
      source: 'api',
    })

    assert.deepEqual(result, {
      tier_slug: 'loyalty_club',
      cashback_rate: 12,
      effective_tier_slug: 'vip',
      effective_cashback_rate: 15,
      deferred_by_promotion: 'promo-override',
    })

    const [snapshotWrite] = db.writes('member_promotions')
    assert.deepEqual(snapshotWrite.payload, { original_tier_slug: 'loyalty_club', original_cashback_rate: 12 })
    assert.equal(db.writes('customers').length, 0)

    const metadata = (db.writes('analytics_events')[0].payload as { metadata: Record<string, unknown> }).metadata
    assert.equal(metadata.deferred_by_promotion, 'promo-override')
    assert.equal(metadata.promotion_type, 'tier_override')
    assert.equal(metadata.from_tier, 'base')
    assert.equal(metadata.to_tier, 'loyalty_club')
    assert.equal(metadata.effective_cashback_rate, 15)

    assert.equal(pushes.length, 1)
  })

  it('promotion ended between read and write: the change applies directly', async () => {
    const db = useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'base', cashback_rate: 5 },
      activePromo: { id: 'promo-boost', type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base' },
      promoStillActive: false,
    })

    const result = await service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' })

    assert.equal(result.deferred_by_promotion, null)
    assert.equal(result.effective_cashback_rate, 10)
    assert.deepEqual(db.writes('customers')[0].payload, { loyalty_stage: 'loyalty_club', cashback_rate: 10 })
  })

  it('pushPass false: no wallet-pass push', async () => {
    useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'base', cashback_rate: 5 },
      activePromo: null,
    })

    await service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'vip', pushPass: false })

    assert.deepEqual(pushes, [])
  })

  it('snapshot write error: throws 500 and leaves the customer untouched', async () => {
    const db = useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'base', cashback_rate: 20 },
      activePromo: { id: 'promo-boost', type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base' },
      errors: { promoUpdate: 'boom' },
    })

    await assert.rejects(
      service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' }),
      (err: unknown) => err instanceof service.MemberAdminError && err.status === 500,
    )
    assert.equal(db.writes('customers').length, 0)
    assert.equal(db.writes('analytics_events').length, 0)
  })

  it('customer write error: throws 500', async () => {
    useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'base', cashback_rate: 5 },
      activePromo: null,
      errors: { customerUpdate: 'boom' },
    })

    await assert.rejects(
      service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' }),
      (err: unknown) => err instanceof service.MemberAdminError && err.status === 500,
    )
  })

  it('event insert error: throws 500', async () => {
    useFixture({
      customer: { id: CUSTOMER_ID, studio_id: STUDIO_ID, loyalty_stage: 'base', cashback_rate: 5 },
      activePromo: null,
      errors: { eventInsert: 'boom' },
    })

    await assert.rejects(
      service.changeTier({ studioId: STUDIO_ID, customerId: CUSTOMER_ID, tierSlug: 'loyalty_club' }),
      (err: unknown) => err instanceof service.MemberAdminError && err.status === 500,
    )
  })
})

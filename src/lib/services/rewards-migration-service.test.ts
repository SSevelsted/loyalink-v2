// Rewards-config migration of existing members, against an in-memory
// database. Run with `npm test`.
//
// A member with an active promotion keeps the promotion as the main deal: the
// migration moves the promotion's fallback snapshot, and the customer row
// shows the better of the promotion rate and the new fallback. Nothing in
// another studio moves.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, wireFake, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { OTHER_STUDIO_ID, REWARDS_CONFIG, STUDIO_ID, customerRow, promotionRow, studioRow } from '@/test/loyalty-fixtures'
import { migrateRewardsConfig } from '@/types/database'

type Service = typeof import('./rewards-migration-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: Service
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']

// New config for studio A: loyalty_club is removed (members map to
// inner_circle) and the base rate goes 7.5 → 10.
const NEW_CONFIG = migrateRewardsConfig({
  ...REWARDS_CONFIG,
  tiers: [
    { ...REWARDS_CONFIG.tiers[0], cashback_rate: 10 },
    { ...REWARDS_CONFIG.tiers[2], upgrade_trigger: { type: 'first_full_payment' } },
  ],
})

function seed(customers: Row[], promotions: Row[]): FakeSupabase {
  const fake = createFakeSupabase({
    studios: [studioRow(STUDIO_ID), studioRow(OTHER_STUDIO_ID)],
    customers,
    member_promotions: promotions,
    analytics_events: [],
  })
  wireFake(adminSupabase, fake)
  return fake
}

// Studio B uses the same slugs with its own rates. Its members and promotions
// must never move when studio A migrates.
const otherStudioRows = () => ({
  customers: [
    customerRow('b-member', { studio_id: OTHER_STUDIO_ID, loyalty_stage: 'loyalty_club', cashback_rate: 12 }),
    customerRow('b-boosted', { studio_id: OTHER_STUDIO_ID, loyalty_stage: 'base', cashback_rate: 25 }),
    customerRow('b-boosted-lc', { studio_id: OTHER_STUDIO_ID, loyalty_stage: 'loyalty_club', cashback_rate: 25 }),
  ],
  promotions: [
    promotionRow('b-promo-base', 'b-boosted', {
      studio_id: OTHER_STUDIO_ID, type: 'cashback_boost', cashback_rate: 25, original_tier_slug: 'base', original_cashback_rate: 5,
    }),
    promotionRow('b-promo-lc', 'b-boosted-lc', {
      studio_id: OTHER_STUDIO_ID, type: 'cashback_boost', cashback_rate: 25, original_tier_slug: 'loyalty_club', original_cashback_rate: 12,
    }),
  ],
})

function assertOtherStudioUntouched(fake: FakeSupabase) {
  const other = otherStudioRows()
  for (const expected of [...other.customers, ...other.promotions]) {
    const table = 'type' in expected ? 'member_promotions' : 'customers'
    const actual = fake.row(table, expected.id as string)
    for (const column of ['loyalty_stage', 'cashback_rate', 'original_tier_slug', 'original_cashback_rate', 'status']) {
      assert.equal(actual[column], expected[column], `${table} ${expected.id}.${column} moved`)
    }
  }
}

before(async () => {
  setTestEnv()
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./rewards-migration-service')
  originalFrom = adminSupabase.from

  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(
    service.migrateExistingMembers({ studioId: STUDIO_ID, config: NEW_CONFIG, mappings: { loyalty_club: 'inner_circle' }, applyRateChanges: false }),
    /fake-wired/,
    'migrateExistingMembers does not use the patched adminSupabase',
  )
})

after(() => {
  adminSupabase.from = originalFrom
})

describe('migrateExistingMembers: tier remap', () => {
  it('moves plain members, and a boosted member\'s fallback while the boost stays on the row', async () => {
    const other = otherStudioRows()
    const fake = seed(
      [
        customerRow('plain', { loyalty_stage: 'loyalty_club', cashback_rate: 15 }),
        customerRow('boosted', { loyalty_stage: 'loyalty_club', cashback_rate: 25 }),
        ...other.customers,
      ],
      [
        promotionRow('promo', 'boosted', {
          type: 'cashback_boost', cashback_rate: 25, original_tier_slug: 'loyalty_club', original_cashback_rate: 15,
        }),
        ...other.promotions,
      ],
    )

    await service.migrateExistingMembers({
      studioId: STUDIO_ID, config: NEW_CONFIG, mappings: { loyalty_club: 'inner_circle' }, applyRateChanges: false,
    })

    const plain = fake.row('customers', 'plain')
    assert.equal(plain.loyalty_stage, 'inner_circle')
    assert.equal(plain.cashback_rate, 20)

    const promo = fake.row('member_promotions', 'promo')
    assert.equal(promo.original_tier_slug, 'inner_circle')
    assert.equal(promo.original_cashback_rate, 20)
    const boosted = fake.row('customers', 'boosted')
    assert.equal(boosted.loyalty_stage, 'inner_circle')
    assert.equal(boosted.cashback_rate, 25, 'the boost rate stays on the row')

    const events = fake.rows('analytics_events').filter((e) => e.event_type === 'tier_change')
    assert.deepEqual(events.map((e) => e.customer_id).sort(), ['boosted', 'plain'])
    for (const e of events) assert.equal((e.metadata as Row).source, 'migration')

    assertOtherStudioUntouched(fake)
  })

  it('a tier_override on a removed tier moves to the mapped tier', async () => {
    const fake = seed(
      [customerRow('overridden', { loyalty_stage: 'loyalty_club', cashback_rate: 15 })],
      [promotionRow('promo', 'overridden', {
        type: 'tier_override', tier_slug: 'loyalty_club', original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    )

    const result = await service.migrateExistingMembers({
      studioId: STUDIO_ID, config: NEW_CONFIG, mappings: { loyalty_club: 'inner_circle' }, applyRateChanges: false,
    })

    const promo = fake.row('member_promotions', 'promo')
    assert.equal(promo.tier_slug, 'inner_circle')
    assert.equal(promo.original_tier_slug, 'base', 'the member\'s own tier is not the removed one')
    const row = fake.row('customers', 'overridden')
    assert.equal(row.loyalty_stage, 'inner_circle')
    assert.equal(row.cashback_rate, 20)
    assert.equal(result.migratedPromotions, 1)
    assert.equal(fake.rows('analytics_events').length, 0, 'the own tier did not move')
  })

  it('a promotion in another studio with the same slug stays untouched', async () => {
    const other = otherStudioRows()
    const fake = seed(other.customers, other.promotions)

    await service.migrateExistingMembers({
      studioId: STUDIO_ID, config: NEW_CONFIG, mappings: { loyalty_club: 'inner_circle' }, applyRateChanges: true,
    })

    assertOtherStudioUntouched(fake)
  })

  it('moves every member past the 1000-row read cap', async () => {
    const members = Array.from({ length: 1005 }, (_, i) =>
      customerRow(`m${i}`, { loyalty_stage: 'loyalty_club', cashback_rate: 15 }))
    const fake = seed(members, [])

    const result = await service.migrateExistingMembers({
      studioId: STUDIO_ID, config: NEW_CONFIG, mappings: { loyalty_club: 'inner_circle' }, applyRateChanges: false,
    })

    assert.equal(fake.rows('customers').filter((c) => c.loyalty_stage === 'inner_circle').length, 1005)
    assert.equal(fake.rows('analytics_events').length, 1005)
    assert.equal(result.migratedMembers, 1005)
  })
})

describe('migrateExistingMembers: rate change', () => {
  it('updates plain members, moves fallbacks, keeps each boosted row on the best deal', async () => {
    const other = otherStudioRows()
    const fake = seed(
      [
        customerRow('plain'),
        customerRow('boost-above', { cashback_rate: 20 }),
        customerRow('boost-below', { cashback_rate: 8 }),
        ...other.customers,
      ],
      [
        promotionRow('promo-above', 'boost-above', {
          type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
        }),
        promotionRow('promo-below', 'boost-below', {
          type: 'cashback_boost', cashback_rate: 8, original_tier_slug: 'base', original_cashback_rate: 7.5,
        }),
        ...other.promotions,
      ],
    )

    await service.migrateExistingMembers({ studioId: STUDIO_ID, config: NEW_CONFIG, mappings: {}, applyRateChanges: true })

    assert.equal(fake.row('customers', 'plain').cashback_rate, 10)
    assert.equal(fake.row('member_promotions', 'promo-above').original_cashback_rate, 10)
    assert.equal(fake.row('customers', 'boost-above').cashback_rate, 20)
    assert.equal(fake.row('member_promotions', 'promo-below').original_cashback_rate, 10)
    assert.equal(fake.row('customers', 'boost-below').cashback_rate, 10)

    assertOtherStudioUntouched(fake)
  })
})

describe('applyFriendRateToMembers', () => {
  it('moves the fallback of a boosted friend-tier member and keeps the boost on the row', async () => {
    const other = otherStudioRows()
    const fake = seed(
      [customerRow('plain'), customerRow('boosted', { cashback_rate: 20 }), ...other.customers],
      [
        promotionRow('promo', 'boosted', {
          type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
        }),
        ...other.promotions,
      ],
    )

    const updated = await service.applyFriendRateToMembers({ studioId: STUDIO_ID, config: NEW_CONFIG, friendSlug: 'base', rate: 10 })

    assert.equal(fake.row('customers', 'plain').cashback_rate, 10)
    assert.equal(fake.row('member_promotions', 'promo').original_cashback_rate, 10)
    assert.equal(fake.row('customers', 'boosted').cashback_rate, 20)
    assert.equal(updated, 2)

    assertOtherStudioUntouched(fake)
  })
})

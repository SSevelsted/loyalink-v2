// Campaign / automation content actions against an in-memory database. Run
// with `npm test`.
//
// A campaign cashback boost raises the member's own rate. Nothing reverts it
// (metadata.cashback_boost.expires_at is never read back), so during an active
// promotion it belongs in the promotion's fallback snapshot, and the row shows
// the better of the promotion rate and that fallback.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, wireFake, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { STUDIO_ID, customerRow, promotionRow, studioRow } from '@/test/loyalty-fixtures'

type Service = typeof import('./campaign-actions-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: Service
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']

const BOOST = { action: 'cashback_boost' as const, cashback_rate: 5, cashback_duration_days: 30 }

function seed(customers: Row[], promotions: Row[] = []): FakeSupabase {
  const fake = createFakeSupabase({
    studios: [studioRow(STUDIO_ID)],
    customers,
    member_promotions: promotions,
    transactions: [],
  })
  wireFake(adminSupabase, fake)
  return fake
}

before(async () => {
  setTestEnv()
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./campaign-actions-service')
  originalFrom = adminSupabase.from

  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(
    service.applyContentActions(['c1'], STUDIO_ID, BOOST, { source: 'campaign' }),
    /fake-wired/,
    'applyContentActions does not use the patched adminSupabase',
  )
})

after(() => {
  adminSupabase.from = originalFrom
})

describe('applyContentActions: cashback_boost', () => {
  it('no promotion: adds the bonus to the member\'s rate and records the boost', async () => {
    const fake = seed([customerRow('c1')])

    await service.applyContentActions(['c1'], STUDIO_ID, BOOST, { source: 'campaign' })

    const row = fake.row('customers', 'c1')
    assert.equal(row.cashback_rate, 12.5)
    const boost = (row.metadata as Row).cashback_boost as Row
    assert.equal(boost.original_rate, 7.5)
    assert.equal(boost.bonus_rate, 5)
  })

  it('during a promotion: the bonus lands on the fallback, the promotion rate stays on the row', async () => {
    const fake = seed(
      [customerRow('c1', { cashback_rate: 20 })],
      [promotionRow('promo', 'c1', {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    )

    await service.applyContentActions(['c1'], STUDIO_ID, BOOST, { source: 'campaign' })

    assert.equal(fake.row('member_promotions', 'promo').original_cashback_rate, 12.5)
    const row = fake.row('customers', 'c1')
    assert.equal(row.cashback_rate, 20)
    assert.equal(((row.metadata as Row).cashback_boost as Row).original_rate, 7.5)
  })

  it('during a promotion below the raised fallback: the row shows the raised fallback', async () => {
    const fake = seed(
      [customerRow('c1', { cashback_rate: 10 })],
      [promotionRow('promo', 'c1', {
        type: 'cashback_boost', cashback_rate: 10, original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    )

    await service.applyContentActions(['c1'], STUDIO_ID, BOOST, { source: 'automation' })

    assert.equal(fake.row('member_promotions', 'promo').original_cashback_rate, 12.5)
    assert.equal(fake.row('customers', 'c1').cashback_rate, 12.5)
  })

  it('a member of another studio is skipped', async () => {
    const fake = seed([customerRow('c1', { studio_id: 'studio-b' })])

    await service.applyContentActions(['c1'], STUDIO_ID, BOOST, { source: 'campaign' })

    assert.equal(fake.row('customers', 'c1').cashback_rate, 7.5)
  })
})

describe('applyContentActions: add_balance', () => {
  it('credits the balance and records an adjustment', async () => {
    const fake = seed([customerRow('c1', { balance: 100 })])

    await service.applyContentActions(['c1'], STUDIO_ID, { action: 'add_balance', amount: 50 }, { source: 'automation' })

    assert.equal(fake.row('customers', 'c1').balance, 150)
    const [tx] = fake.rows('transactions')
    assert.equal(tx.type, 'adjustment')
    assert.equal(tx.amount, 50)
    assert.equal(tx.description, 'Automation bonus')
  })
})

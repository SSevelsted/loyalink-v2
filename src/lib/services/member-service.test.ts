// createMember with a referral code, against an in-memory database.
// Run with `npm test`.
//
// referrals.referral_code holds the REFERRER's code. Prod had UNIQUE
// (studio_id, referral_code), so a member's 2nd friend failed the referral
// insert, and createMember ignored the error: the friend joined with no
// referrer and nobody saw it. Migration 027 drops that constraint.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FailRule, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { REWARDS_CONFIG, STUDIO_ID, customerRow, studioRow } from '@/test/loyalty-fixtures'

type MemberService = typeof import('./member-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let members: MemberService
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

// The constraints prod has after migration 027, and the one it drops.
const AFTER_027 = [['referred_customer_id']]
const BEFORE_027 = [['referred_customer_id'], ['studio_id', 'referral_code']]

function seed(options: {
  config?: unknown
  customers?: Row[]
  referralConstraints?: string[][]
  preExisting?: Row[]
  fail?: FailRule[]
} = {}): FakeSupabase {
  const fake = createFakeSupabase({
    studios: [studioRow(STUDIO_ID, options.config ?? REWARDS_CONFIG)],
    customers: options.customers ?? [
      customerRow('giver', { referral_code: 'GIVER123', email: 'giver@example.com', phone: '+4511111111' }),
    ],
    referrals: [],
    transactions: [],
    analytics_events: [],
    studio_webhooks: [],
    studio_landing_pages: [],
    studio_pre_existing_clients: options.preExisting ?? [],
  }, { unique: { referrals: options.referralConstraints ?? AFTER_027 }, fail: options.fail })
  wireFake(adminSupabase, fake)
  return fake
}

function join(name: string, fields: { email?: string; phone?: string; referralCode?: string | null } = {}) {
  return members.createMember({
    studioId: STUDIO_ID,
    name,
    email: fields.email ?? `${name.toLowerCase()}@example.com`,
    phone: fields.phone ?? null,
    referralCode: fields.referralCode === undefined ? 'giver123' : fields.referralCode,
  })
}

const referralsOf = (fake: FakeSupabase, referrerId: string) =>
  fake.rows('referrals').filter((r) => r.referrer_customer_id === referrerId)

before(async () => {
  setTestEnv()
  process.env.CUSTOMER_ACCESS_SECRET ??= 'test-customer-access-secret'
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  members = await import('./member-service')
  originalFrom = adminSupabase.from
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

describe('createMember: many friends per referral code', () => {
  it('links 3 friends who join with the same giver code', async () => {
    const fake = seed()

    const results = [await join('Ana'), await join('Ben'), await join('Cleo')]

    assert.deepEqual(results.map((r) => r.referral_linked), [true, true, true])
    const rows = referralsOf(fake, 'giver')
    assert.equal(rows.length, 3)
    assert.deepEqual(
      rows.map((r) => r.referred_customer_id).sort(),
      results.map((r) => r.customerId).sort(),
    )
    assert.ok(rows.every((r) => r.referral_code === 'GIVER123' && r.status === 'pending'))
  })

  it('with the old (studio_id, referral_code) constraint the 2nd friend is created, reported as not linked, and gets no welcome bonus', async () => {
    const config = { ...REWARDS_CONFIG, referrals: { ...REWARDS_CONFIG.referrals, friend_welcome_bonus: 100 } }
    const fake = seed({ config, referralConstraints: BEFORE_027 })
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => { errors.push(args) }
    try {
      const first = await join('Ana')
      const second = await join('Ben')

      assert.equal(first.referral_linked, true)
      assert.equal(second.referral_linked, false)
      assert.equal(second.referral_not_linked_reason, 'insert_failed')
      assert.ok(fake.row('customers', second.customerId), 'the member is still created')
      assert.equal(fake.row('customers', second.customerId).balance, undefined, 'no welcome bonus written')
      assert.equal(fake.row('customers', first.customerId).balance, 100)
      assert.equal(
        fake.rows('transactions').filter((t) => t.customer_id === second.customerId).length,
        0,
        'no welcome-bonus transaction for an unlinked friend',
      )
      assert.ok(errors.some((e) => String(e[0]).includes('[referrals] referral insert failed')), 'the failure is logged')
    } finally {
      console.error = originalError
    }
  })

  it('reports why a code did not link', async () => {
    seed({
      customers: [customerRow('giver', { referral_code: 'GIVER123', email: 'giver@example.com' })],
      preExisting: [{ id: 'pe-1', studio_id: STUDIO_ID, email: 'old@example.com', phone: null }],
    })

    assert.equal((await join('Nobody', { referralCode: 'NOPE0000' })).referral_not_linked_reason, 'code_not_found')
    assert.equal((await join('Self', { email: 'GIVER@example.com', referralCode: 'GIVER123' })).referral_not_linked_reason, 'self_referral')
    assert.equal((await join('Old', { email: 'old@example.com', phone: '+4522222222' })).referral_not_linked_reason, 'pre_existing_client')
  })

  it('reports referrals_disabled when the studio has referrals off', async () => {
    seed({ config: { ...REWARDS_CONFIG, referrals: { ...REWARDS_CONFIG.referrals, enabled: false } } })

    const result = await join('Ana')

    assert.equal(result.referral_linked, false)
    assert.equal(result.referral_not_linked_reason, 'referrals_disabled')
  })

  it('returns referral_linked: null when no code was given', async () => {
    const fake = seed()

    const result = await join('Ana', { referralCode: null })

    assert.equal(result.referral_linked, null)
    assert.equal(result.referral_not_linked_reason, undefined)
    assert.equal(fake.rows('referrals').length, 0)
  })
})

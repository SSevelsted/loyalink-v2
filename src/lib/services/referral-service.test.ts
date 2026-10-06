// Referral activation, the referrer bonus and the commission, against an
// in-memory database. Run with `npm test`.
//
// Before this fix, processTransaction checked the activation trigger on
// `{ ...customer, has_purchased: true }`, so first_purchase and
// first_full_payment never passed and no referral ever activated.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FailRule, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { OTHER_STUDIO_ID, REWARDS_CONFIG, STUDIO_ID, customerRow, promotionRow, studioRow } from '@/test/loyalty-fixtures'

type TransactionService = typeof import('./transaction-service')
type ReferralService = typeof import('./referral-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let transactions: TransactionService
let referrals: ReferralService
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

type Trigger = { type: string; threshold?: number }

function referralConfig(trigger: Trigger = { type: 'first_purchase' }, overrides: Record<string, unknown> = {}) {
  return {
    ...REWARDS_CONFIG,
    referrals: {
      ...REWARDS_CONFIG.referrals,
      referrer_commission_rate: 5,
      referrer_commission_duration_days: 60,
      referrer_cashback_bonus_per_ref: 2.5,
      referrer_cashback_cap: 20,
      activation_trigger: trigger,
      ...overrides,
    },
  }
}

function pendingReferral(id = 'ref-1', fields: Row = {}): Row {
  return {
    id,
    studio_id: STUDIO_ID,
    referrer_customer_id: 'referrer',
    referred_customer_id: 'friend',
    referral_code: `CODE-${id}`,
    status: 'pending',
    activated_at: null,
    commission_expires_at: null,
    total_commission_earned: 0,
    created_at: '2026-09-01T00:00:00.000Z',
    ...fields,
  }
}

function seed(options: {
  config?: unknown
  customers?: Row[]
  promotions?: Row[]
  referralRows?: Row[]
  studios?: Row[]
  fail?: FailRule[]
} = {}): FakeSupabase {
  const fake = createFakeSupabase({
    studios: options.studios ?? [studioRow(STUDIO_ID, options.config ?? referralConfig())],
    customers: options.customers ?? [
      customerRow('referrer'),
      customerRow('friend', { has_purchased: false, total_real_spend: 0 }),
    ],
    member_promotions: options.promotions ?? [],
    referrals: options.referralRows ?? [pendingReferral()],
    transactions: [],
    analytics_events: [],
    studio_webhooks: [],
    wallet_passes: [],
    legacy_loyalty_links: [],
  }, { fail: options.fail })
  wireFake(adminSupabase, fake)
  return fake
}

function purchase(amount = 1000, isDeposit = false, customerId = 'friend') {
  return transactions.processTransaction({ customerId, studioId: STUDIO_ID, amount, isDeposit })
}

const commissions = (fake: FakeSupabase) =>
  fake.rows('transactions').filter((t) => t.type === 'referral_commission').map((t) => t.amount)

before(async () => {
  setTestEnv()
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  transactions = await import('./transaction-service')
  referrals = await import('./referral-service')
  originalFrom = adminSupabase.from

  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(purchase(), /fake-wired/, 'processTransaction does not use the patched adminSupabase')
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

describe('processTransaction: referral activation', () => {
  it('first_purchase: the friend\'s first purchase activates the referral and credits the referrer', async () => {
    const fake = seed()
    const before = Date.now()

    const result = await purchase()

    const referral = fake.row('referrals', 'ref-1')
    assert.equal(referral.status, 'activated')
    assert.ok(referral.activated_at)
    const window = new Date(referral.commission_expires_at as string).getTime() - before
    assert.ok(Math.abs(window - 60 * 86400000) < 60000, 'commission window is 60 days')

    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.cashback_rate, 10)
    assert.equal(referrer.referral_count, 1)
    assert.ok(result.results.includes('Referral activated. Referrer now at 10% cashback'))
    assert.ok(fetchStub.urls.includes('http://pass.test/api/push/customer/referrer'), 'referrer pass pushed')

    // The activating purchase also pays the referrer's commission.
    assert.deepEqual(commissions(fake), [50])
    assert.equal(referrer.balance, 50)
    assert.equal(referral.total_commission_earned, 50)
  })

  it('first_purchase: a deposit counts', async () => {
    const fake = seed()

    await purchase(500, true)

    assert.equal(fake.row('referrals', 'ref-1').status, 'activated')
    assert.equal(fake.row('customers', 'referrer').cashback_rate, 10)
  })

  it('first_full_payment: a deposit does not activate; the full payment after it does', async () => {
    const fake = seed({ config: referralConfig({ type: 'first_full_payment' }) })

    await purchase(500, true)
    assert.equal(fake.row('referrals', 'ref-1').status, 'pending')
    assert.equal(fake.row('customers', 'referrer').cashback_rate, 7.5)
    assert.equal(fake.row('customers', 'friend').has_purchased, true)

    await purchase(2000, false)
    assert.equal(fake.row('referrals', 'ref-1').status, 'activated')
    assert.equal(fake.row('customers', 'referrer').cashback_rate, 10)
    assert.deepEqual(commissions(fake), [100], 'no commission on the deposit before activation')
  })

  it('total_spend: activates when the friend\'s spend reaches the threshold', async () => {
    const fake = seed({ config: referralConfig({ type: 'total_spend', threshold: 1500 }) })

    await purchase(1000)
    assert.equal(fake.row('referrals', 'ref-1').status, 'pending')

    await purchase(500)
    assert.equal(fake.row('referrals', 'ref-1').status, 'activated')
  })

  it('a second purchase does not activate again; commission is paid per purchase', async () => {
    const fake = seed()

    await purchase(1000)
    await purchase(1000)

    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.cashback_rate, 10)
    assert.equal(referrer.referral_count, 1)
    assert.deepEqual(commissions(fake), [50, 50])
    assert.equal(fake.row('referrals', 'ref-1').total_commission_earned, 100)
  })

  it('two concurrent purchases activate once and credit the bonus once', async () => {
    const fake = seed()

    await Promise.all([purchase(1000), purchase(1000)])

    const activationWrites = fake.calls.filter((c) =>
      c.table === 'referrals' && c.op === 'update' && c.filters.some(([col, , v]) => col === 'status' && v === 'pending'))
    assert.equal(activationWrites.length, 2, 'both purchases saw the pending referral')
    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.cashback_rate, 10)
    assert.equal(referrer.referral_count, 1)
  })

  it('referrer during an active boost: the bonus lands in the fallback, the row keeps the boost', async () => {
    const fake = seed({
      customers: [
        customerRow('referrer', { cashback_rate: 20 }),
        customerRow('friend', { has_purchased: false, total_real_spend: 0 }),
      ],
      promotions: [promotionRow('promo', 'referrer', {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    })

    const result = await purchase()

    assert.equal(fake.row('member_promotions', 'promo').original_cashback_rate, 10)
    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.cashback_rate, 20)
    assert.equal(referrer.referral_count, 1)
    assert.ok(result.results.includes('Referral activated. Referrer now at 20% cashback'))
  })

  it('referral program disabled: nothing activates', async () => {
    const fake = seed({ config: referralConfig({ type: 'first_purchase' }, { enabled: false }) })

    await purchase()

    assert.equal(fake.row('referrals', 'ref-1').status, 'pending')
    assert.equal(fake.row('customers', 'referrer').cashback_rate, 7.5)
  })

  it('unlimited commission window (0 days): no expiry, commission still paid', async () => {
    const fake = seed({ config: referralConfig({ type: 'first_purchase' }, { referrer_commission_duration_days: 0 }) })

    await purchase(1000)
    await purchase(1000)

    assert.equal(fake.row('referrals', 'ref-1').commission_expires_at, null)
    assert.deepEqual(commissions(fake), [50, 50])
  })

  it('the activation write fails: the purchase still goes through and nothing is credited', async () => {
    const fake = seed({ fail: [{ table: 'referrals', op: 'update', message: 'boom' }] })

    const result = await purchase()

    assert.equal(fake.row('referrals', 'ref-1').status, 'pending')
    assert.equal(fake.row('customers', 'referrer').cashback_rate, 7.5)
    assert.ok(result.results.includes('Referral activation failed: boom'))
    assert.equal(fake.rows('transactions').filter((t) => t.type === 'cashback').length, 1)
  })
})

// Owner decision 2026-10-06: at switched studios Inner Circle is reached at 3
// activated referrals (friends who paid), and Loyalink upgrades the giver at
// the friend's payment, not at the giver's own next purchase.
describe('activateReferral: referral_count tier upgrade at the friend\'s payment', () => {
  function innerCircleConfig(threshold = 3) {
    return {
      ...referralConfig({ type: 'first_full_payment' }, {
        referrer_cashback_bonus_per_ref: 0,
        referrer_commission_rate: 0,
      }),
      tiers: [
        REWARDS_CONFIG.tiers[0],
        REWARDS_CONFIG.tiers[1],
        { ...REWARDS_CONFIG.tiers[2], upgrade_trigger: { type: 'referral_count', threshold } },
      ],
    }
  }

  type Hook = { event: string; customerId: string; data: Row }

  async function activate(fake: FakeSupabase) {
    const hooks: Hook[] = []
    const results: string[] = []
    const settings = fake.row('studios', STUDIO_ID).settings as Row
    const { migrateRewardsConfig } = await import('@/types/database')
    const activated = await referrals.activateReferral({
      referral: { id: 'ref-1', referrer_customer_id: 'referrer', referred_customer_id: 'friend' },
      studioId: STUDIO_ID,
      config: migrateRewardsConfig(settings.rewards_config),
      results,
      queueWebhook: (_studio, event, customerId, data) => { hooks.push({ event, customerId, data: data as Row }) },
    })
    assert.equal(activated, true)
    return { hooks, results }
  }

  const activatedHook = (hooks: Hook[]) => hooks.find((h) => h.event === 'referral.activated')!.data
  const tierEvents = (fake: FakeSupabase) =>
    fake.rows('analytics_events').filter((e) => e.event_type === 'tier_change').map((e) => (e.metadata as Row).to_tier)

  it('2nd activation: no upgrade', async () => {
    const fake = seed({
      config: innerCircleConfig(),
      customers: [customerRow('referrer', { loyalty_stage: 'loyalty_club', cashback_rate: 15, referral_count: 1 }), customerRow('friend')],
    })
    const { hooks } = await activate(fake)
    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.loyalty_stage, 'loyalty_club')
    assert.equal(referrer.cashback_rate, 15)
    assert.equal(referrer.referral_count, 2)
    const data = activatedHook(hooks)
    assert.equal(data.referrer_referral_count, 2)
    assert.equal(data.referrer_loyalty_stage, 'loyalty_club')
    assert.equal(data.referrer_tier_upgraded_to, null)
    assert.equal(hooks.some((h) => h.event === 'tier.upgraded'), false)
    assert.deepEqual(tierEvents(fake), [])
  })

  it('3rd activation: upgrades to inner_circle, fires tier.upgraded and a tier_change event', async () => {
    const fake = seed({
      config: innerCircleConfig(),
      customers: [customerRow('referrer', { loyalty_stage: 'loyalty_club', cashback_rate: 15, referral_count: 2 }), customerRow('friend')],
    })
    const { hooks, results } = await activate(fake)
    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.loyalty_stage, 'inner_circle')
    assert.equal(referrer.cashback_rate, 20)
    assert.equal(referrer.referral_count, 3)
    assert.ok(results.includes('Referrer upgraded to inner_circle at 20%'))

    const data = activatedHook(hooks)
    assert.deepEqual(data, {
      referrer_customer_id: 'referrer',
      referrer_new_cashback_rate: 20,
      referrer_referral_count: 3,
      referrer_loyalty_stage: 'inner_circle',
      referrer_tier_upgraded_to: 'inner_circle',
    })
    const upgraded = hooks.find((h) => h.event === 'tier.upgraded')
    assert.ok(upgraded)
    assert.equal(upgraded.customerId, 'referrer')
    assert.deepEqual(upgraded.data, { from_tier: 'loyalty_club', to_tier: 'inner_circle', to_tier_name: 'Inner Circle', cashback_rate: 20 })
    assert.deepEqual(tierEvents(fake), ['inner_circle'])
    assert.equal((fake.rows('analytics_events')[0].metadata as Row).source, 'referral')
  })

  it('3rd activation from the base tier jumps straight to inner_circle', async () => {
    const fake = seed({
      config: innerCircleConfig(),
      customers: [customerRow('referrer', { has_purchased: false, referral_count: 2 }), customerRow('friend')],
    })
    await activate(fake)
    assert.equal(fake.row('customers', 'referrer').loyalty_stage, 'inner_circle')
    assert.equal(fake.row('customers', 'referrer').cashback_rate, 20)
  })

  it('a member already on inner_circle stays, with their rate', async () => {
    const fake = seed({
      config: innerCircleConfig(),
      customers: [customerRow('referrer', { loyalty_stage: 'inner_circle', cashback_rate: 22, referral_count: 5 }), customerRow('friend')],
    })
    const { hooks } = await activate(fake)
    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.loyalty_stage, 'inner_circle')
    assert.equal(referrer.cashback_rate, 22)
    assert.equal(referrer.referral_count, 6)
    assert.equal(activatedHook(hooks).referrer_loyalty_stage, 'inner_circle')
    assert.equal(activatedHook(hooks).referrer_tier_upgraded_to, null)
    assert.equal(hooks.some((h) => h.event === 'tier.upgraded'), false)
  })

  it('active boost: the promotion keeps paying its rate, the fallback becomes inner_circle', async () => {
    const fake = seed({
      config: innerCircleConfig(),
      customers: [customerRow('referrer', { loyalty_stage: 'loyalty_club', cashback_rate: 25, referral_count: 2 }), customerRow('friend')],
      promotions: [promotionRow('promo', 'referrer', {
        type: 'cashback_boost', cashback_rate: 25, original_tier_slug: 'loyalty_club', original_cashback_rate: 15,
      })],
    })
    const { hooks } = await activate(fake)
    const promo = fake.row('member_promotions', 'promo')
    assert.equal(promo.status, 'active')
    assert.equal(promo.original_tier_slug, 'inner_circle')
    assert.equal(promo.original_cashback_rate, 20)
    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.cashback_rate, 25, 'the promotion pays more: the member earns the max')
    assert.equal(referrer.loyalty_stage, 'inner_circle')
    const data = activatedHook(hooks)
    assert.equal(data.referrer_new_cashback_rate, 25)
    assert.equal(data.referrer_loyalty_stage, 'inner_circle')
    assert.equal(data.referrer_tier_upgraded_to, 'inner_circle')
    const metadata = fake.rows('analytics_events')[0].metadata as Row
    assert.equal(metadata.deferred_by_promotion, 'promo')
  })

  it('active tier_override: the override tier stays on the row, the fallback becomes inner_circle', async () => {
    const fake = seed({
      config: innerCircleConfig(),
      customers: [customerRow('referrer', { loyalty_stage: 'loyalty_club', cashback_rate: 15, referral_count: 2 }), customerRow('friend')],
      promotions: [promotionRow('promo', 'referrer', {
        type: 'tier_override', tier_slug: 'loyalty_club', original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
    })
    await activate(fake)
    const promo = fake.row('member_promotions', 'promo')
    assert.equal(promo.original_tier_slug, 'inner_circle')
    assert.equal(promo.original_cashback_rate, 20)
    const referrer = fake.row('customers', 'referrer')
    assert.equal(referrer.loyalty_stage, 'loyalty_club')
    assert.equal(referrer.cashback_rate, 20, 'the fallback pays more: the member earns the max')
  })

  it('the threshold comes from the config', async () => {
    const fake = seed({
      config: innerCircleConfig(5),
      customers: [customerRow('referrer', { loyalty_stage: 'loyalty_club', cashback_rate: 15, referral_count: 2 }), customerRow('friend')],
    })
    await activate(fake)
    assert.equal(fake.row('customers', 'referrer').loyalty_stage, 'loyalty_club')

    const tiers = innerCircleConfig(5).tiers as never
    assert.equal(referrals.referralUpgradeTier({ tiers }, 'loyalty_club', 4), null)
    assert.equal(referrals.referralUpgradeTier({ tiers }, 'loyalty_club', 5)?.slug, 'inner_circle')
    assert.equal(referrals.referralUpgradeTier({ tiers }, 'inner_circle', 9), null)
    assert.equal(referrals.referralUpgradeTier({ tiers: REWARDS_CONFIG.tiers as never }, 'base', 99), null, 'no referral_count tier')
  })

  it('end to end: the 3rd friend\'s full payment upgrades the giver; a deposit does not', async () => {
    const fake = seed({
      config: innerCircleConfig(),
      customers: [
        customerRow('referrer', { loyalty_stage: 'loyalty_club', cashback_rate: 15, referral_count: 2 }),
        customerRow('friend', { has_purchased: false, total_real_spend: 0 }),
      ],
    })
    await purchase(500, true)
    assert.equal(fake.row('customers', 'referrer').loyalty_stage, 'loyalty_club')
    await purchase(2000, false)
    assert.equal(fake.row('customers', 'referrer').loyalty_stage, 'inner_circle')
    assert.equal(fake.row('customers', 'referrer').referral_count, 3)
  })
})

describe('referralTriggerMet', () => {
  const friend = { referral_count: 0, created_at: '2026-09-01T00:00:00.000Z' }
  const now = new Date('2026-09-11T00:00:00.000Z')

  it('applies each trigger type to this transaction', () => {
    const met = (trigger: Trigger, tx: { newSpendTotal?: number; isDeposit?: boolean } = {}, f = friend) =>
      referrals.referralTriggerMet(trigger as never, f, { newSpendTotal: tx.newSpendTotal ?? 1000, isDeposit: tx.isDeposit, now })

    assert.equal(met({ type: 'first_purchase' }), true)
    assert.equal(met({ type: 'first_purchase' }, { isDeposit: true }), true)
    assert.equal(met({ type: 'first_full_payment' }), true)
    assert.equal(met({ type: 'first_full_payment' }, { isDeposit: true }), false)
    assert.equal(met({ type: 'total_spend', threshold: 1000 }, { newSpendTotal: 999 }), false)
    assert.equal(met({ type: 'total_spend', threshold: 1000 }, { newSpendTotal: 1000, isDeposit: true }), true)
    assert.equal(met({ type: 'referral_count', threshold: 1 }), false)
    assert.equal(met({ type: 'referral_count', threshold: 1 }, {}, { ...friend, referral_count: 1 }), true)
    assert.equal(met({ type: 'days_member', threshold: 10 }), true)
    assert.equal(met({ type: 'days_member', threshold: 11 }), false)
    assert.equal(met({ type: 'no_such_trigger' }), false)
  })
})

describe('backfill: planPendingReferralActivations / applyPendingReferralActivations', () => {
  function seedBackfill() {
    return seed({
      studios: [
        studioRow(STUDIO_ID, referralConfig({ type: 'first_purchase' })),
        studioRow(OTHER_STUDIO_ID, referralConfig({ type: 'first_full_payment' })),
      ],
      customers: [
        customerRow('referrer'),
        customerRow('boosted-referrer', { cashback_rate: 20 }),
        customerRow('bought', { has_purchased: true, total_real_spend: 800 }),
        customerRow('not-yet', { has_purchased: false, total_real_spend: 0 }),
        customerRow('other-referrer', { studio_id: OTHER_STUDIO_ID }),
        customerRow('other-bought', { studio_id: OTHER_STUDIO_ID, has_purchased: true, total_real_spend: 500 }),
      ],
      promotions: [promotionRow('promo', 'boosted-referrer', {
        type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'base', original_cashback_rate: 7.5,
      })],
      referralRows: [
        pendingReferral('r-bought', { referred_customer_id: 'bought', created_at: '2026-09-01T00:00:00.000Z' }),
        pendingReferral('r-not-yet', { referrer_customer_id: 'boosted-referrer', referred_customer_id: 'not-yet', created_at: '2026-09-02T00:00:00.000Z' }),
        pendingReferral('r-other', { studio_id: OTHER_STUDIO_ID, referrer_customer_id: 'other-referrer', referred_customer_id: 'other-bought', created_at: '2026-09-03T00:00:00.000Z' }),
      ],
    })
  }

  it('the plan reads only and gives a verdict and the referrer outcome per pending referral', async () => {
    const fake = seedBackfill()

    const plans = await referrals.planPendingReferralActivations()

    assert.deepEqual(plans.map((p) => [p.referral_id, p.verdict]), [
      ['r-bought', 'qualifies'],
      ['r-not-yet', 'no_purchase_yet'],
      ['r-other', 'needs_manual_check'],
    ])
    const boosted = plans.find((p) => p.referral_id === 'r-not-yet')!.referrer!
    assert.deepEqual(
      [boosted.permanent_rate, boosted.new_permanent_rate, boosted.effective_rate_after, boosted.promotion],
      [7.5, 10, 20, 'cashback_boost'],
    )
    assert.equal(fake.calls.filter((c) => c.op !== 'select').length, 0, 'the plan writes nothing')
  })

  it('apply activates only the qualifying referrals, once', async () => {
    const fake = seedBackfill()

    const applied = await referrals.applyPendingReferralActivations(await referrals.planPendingReferralActivations())

    assert.deepEqual(applied.map((a) => [a.referral_id, a.activated]), [['r-bought', true]])
    assert.equal(fake.row('referrals', 'r-bought').status, 'activated')
    assert.equal(fake.row('referrals', 'r-not-yet').status, 'pending')
    assert.equal(fake.row('referrals', 'r-other').status, 'pending')
    assert.equal(fake.row('customers', 'referrer').cashback_rate, 10)
    assert.equal(commissions(fake).length, 0, 'no commission for past purchases')

    const again = await referrals.applyPendingReferralActivations(await referrals.planPendingReferralActivations())
    assert.deepEqual(again, [])
    assert.equal(fake.row('customers', 'referrer').referral_count, 1)
  })
})

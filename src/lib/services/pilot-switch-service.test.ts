// Switch day (scripts/switch-day.ts) against an in-memory database. Run with
// `npm test`.
//
// Owner decisions under test (2026-10-01):
//   - Existing members keep their tier and rate, promotion fallbacks included.
//   - A new member joins on the 5% base tier.
//   - A friend (joined with a giver's referral code) joins on the 10% tier and
//     gets the welcome bonus from Loyalink.
//   - The giver gets no Loyalink bonus and no commission.
//   - The referral activates on the friend's first full payment, not a deposit.
import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeSupabase, setTestEnv, stubFetch, wireFake, type FakeSupabase, type Row } from '@/test/fake-supabase'
import { OTHER_STUDIO_ID, STUDIO_ID, customerRow, promotionRow, studioRow } from '@/test/loyalty-fixtures'
import { migrateRewardsConfig, type RewardsConfig } from '@/types/database'

type Service = typeof import('./pilot-switch-service')
type Members = typeof import('./member-service')
type Transactions = typeof import('./transaction-service')
type AdminClient = typeof import('@/lib/studio-access').adminSupabase

let service: Service
let members: Members
let transactions: Transactions
let adminSupabase: AdminClient
let originalFrom: AdminClient['from']
let fetchStub: ReturnType<typeof stubFetch>

// All Ink's config on 2026-10-01.
const ALL_INK_CONFIG = {
  enabled: true,
  tiers: [
    { slug: 'base', name: 'Base', cashback_rate: 7.5, unlocks_referrals: true },
    { slug: 'loyalty_club', name: 'Loyalty Club', cashback_rate: 15, upgrade_trigger: { type: 'first_full_payment' }, unlocks_referrals: false },
    { slug: 'inner_circle', name: 'Inner Circle', cashback_rate: 20, upgrade_trigger: { type: 'total_spend', threshold: 999999 }, unlocks_referrals: false },
  ],
  referrals: {
    enabled: true,
    friend_tier_slug: 'loyalty_club',
    activation_trigger: { type: 'first_purchase' },
    friend_cashback_rate: 15,
    friend_welcome_bonus: 15,
    referrer_cashback_cap: 25,
    referrer_commission_rate: 5,
    referrer_commission_type: 'percentage',
    referrer_cashback_bonus_per_ref: 2.5,
    referrer_commission_duration_days: 60,
  },
  cashback_on_cashback_balance: false,
}

function pilotStudio(id: string, currency = 'eur', config: unknown = ALL_INK_CONFIG): Row {
  const row = studioRow(id, config)
  return { ...row, settings: { ...(row.settings as Row), currency } }
}

// Existing members of studio A, one per case the switch must leave alone.
const existingMembers = () => [
  customerRow('plain-base', { loyalty_stage: 'base', cashback_rate: 7.5, has_purchased: false, currency: 'EUR', referral_code: 'GIVER001' }),
  customerRow('club', { loyalty_stage: 'loyalty_club', cashback_rate: 15, currency: 'EUR', referral_code: 'GIVER002' }),
  customerRow('boosted-base', { loyalty_stage: 'base', cashback_rate: 15, has_purchased: false, currency: 'EUR' }),
  customerRow('boosted-club', { loyalty_stage: 'loyalty_club', cashback_rate: 20, currency: 'EUR' }),
  customerRow('card-pending', { loyalty_stage: 'card_pending', cashback_rate: 10, has_purchased: false, currency: 'EUR' }),
  customerRow('no-rate', { loyalty_stage: 'base', cashback_rate: null, has_purchased: false, currency: 'EUR' }),
]
const existingPromotions = () => [
  promotionRow('promo-base', 'boosted-base', { type: 'cashback_boost', cashback_rate: 15, original_tier_slug: 'base', original_cashback_rate: 7.5 }),
  promotionRow('promo-club', 'boosted-club', { type: 'cashback_boost', cashback_rate: 20, original_tier_slug: 'loyalty_club', original_cashback_rate: 15 }),
]

function seed(extra: { customers?: Row[]; member_promotions?: Row[]; studios?: Row[]; studio_webhooks?: Row[] } = {}): FakeSupabase {
  const fake = createFakeSupabase({
    studios: extra.studios ?? [pilotStudio(STUDIO_ID), pilotStudio(OTHER_STUDIO_ID)],
    customers: [
      ...existingMembers(),
      customerRow('b-member', { studio_id: OTHER_STUDIO_ID, loyalty_stage: 'base', cashback_rate: 7.5 }),
      ...(extra.customers ?? []),
    ],
    member_promotions: extra.member_promotions ?? existingPromotions(),
    referrals: [],
    transactions: [],
    analytics_events: [],
    studio_webhooks: extra.studio_webhooks ?? [],
    webhook_deliveries: [],
    wallet_passes: [],
    legacy_loyalty_links: [],
    studio_pre_existing_clients: [],
    studio_landing_pages: [],
    audit_logs: [],
  })
  wireFake(adminSupabase, fake)
  return fake
}

async function plan(opts: Parameters<Service['planPilotSwitch']>[1] = {}, studioId = STUDIO_ID) {
  const input = await service.loadPilotSwitchInput(studioId)
  assert.ok(input, 'studio not found')
  return service.planPilotSwitch(input, opts)
}

async function switchStudio() {
  const p = await plan()
  assert.deepEqual(p.blockers, [])
  return service.applyPilotSwitch(p)
}

function savedConfig(fake: FakeSupabase, studioId = STUDIO_ID): RewardsConfig {
  const settings = fake.row('studios', studioId).settings as Row
  return migrateRewardsConfig(settings.rewards_config)
}

before(async () => {
  setTestEnv()
  process.env.CUSTOMER_ACCESS_SECRET ??= 'test-customer-access-secret'
  adminSupabase = (await import('@/lib/studio-access')).adminSupabase
  service = await import('./pilot-switch-service')
  members = await import('./member-service')
  transactions = await import('./transaction-service')
  originalFrom = adminSupabase.from

  Object.assign(adminSupabase, { from: () => { throw new Error('fake-wired') } })
  await assert.rejects(service.loadPilotSwitchInput(STUDIO_ID), /fake-wired/, 'the service does not use the patched adminSupabase')
})

beforeEach(() => { fetchStub = stubFetch() })
afterEach(() => { fetchStub.restore() })
after(() => { adminSupabase.from = originalFrom })

describe('pilotTargetConfig', () => {
  it('reuses the slugs and sets 5 / 10 / 15, the friend tier, no giver bonus, first full payment', () => {
    const target = service.pilotTargetConfig(migrateRewardsConfig(ALL_INK_CONFIG), { welcomeBonus: 25, switchedAt: '2026-10-01T08:00:00.000Z' })
    assert.deepEqual(target.tiers.map((t) => [t.slug, t.cashback_rate, t.upgrade_trigger?.type ?? null, t.upgrade_trigger?.threshold ?? null]), [
      ['base', 5, null, null],
      ['loyalty_club', 10, 'first_full_payment', null],
      ['inner_circle', 15, 'total_spend', 999999],
    ])
    assert.equal(target.referrals.friend_tier_slug, 'loyalty_club')
    assert.equal(target.referrals.friend_cashback_rate, 10)
    assert.equal(target.referrals.friend_welcome_bonus, 25)
    assert.equal(target.referrals.referrer_cashback_bonus_per_ref, 0)
    assert.equal(target.referrals.referrer_commission_rate, 0)
    assert.deepEqual(target.referrals.activation_trigger, { type: 'first_full_payment' })
    assert.equal(target.pilot_switched_at, '2026-10-01T08:00:00.000Z')
    // Survives the normalizer every reader runs.
    assert.equal(migrateRewardsConfig(target).pilot_switched_at, '2026-10-01T08:00:00.000Z')
  })

  it('takes the welcome bonus from the studio currency, or the flag', async () => {
    seed({ studios: [pilotStudio(STUDIO_ID, 'eur'), pilotStudio(OTHER_STUDIO_ID, 'sek')] })
    assert.equal((await plan()).welcomeBonus, 25)
    assert.equal((await plan({}, OTHER_STUDIO_ID)).welcomeBonus, 250)
    assert.equal((await plan({ welcomeBonus: 30 })).target.referrals.friend_welcome_bonus, 30)
  })
})

describe('planPilotSwitch', () => {
  it('existing members keep their deal; only the rate-less row is pinned', async () => {
    seed()
    const p = await plan()
    assert.deepEqual(p.blockers, [])
    assert.equal(p.members.total, 6)
    assert.equal(p.members.keep, 5)
    assert.deepEqual(p.members.pin, [{ customer_id: 'no-rate', tier: 'base', rate: 7.5 }])
    assert.deepEqual(p.members.change, [])
    assert.deepEqual(p.promotions.map((g) => [g.fallback, g.pays_before, g.pays_after]).sort(), [
      ['base 7.5%', 15, 15],
      ['loyalty_club 15%', 20, 20],
    ])
    // A base member who has not paid yet now upgrades to 10%, not 15%.
    const fromBase = p.upgradePath.find((u) => u.from_tier === 'base')
    assert.ok(fromBase)
    assert.equal(fromBase.before, 'loyalty_club 15% (first_full_payment)')
    assert.equal(fromBase.after, 'loyalty_club 10% (first_full_payment)')
    assert.equal(p.upgradeLowers, 0)
  })

  it('blocks a tier_override on a tier whose rate changes', async () => {
    const fake = seed({
      customers: [customerRow('overridden', { loyalty_stage: 'loyalty_club', cashback_rate: 15 })],
      member_promotions: [
        ...existingPromotions(),
        promotionRow('promo-override', 'overridden', { type: 'tier_override', tier_slug: 'loyalty_club', original_tier_slug: 'base', original_cashback_rate: 7.5 }),
      ],
    })
    const p = await plan()
    assert.equal(p.members.change.length, 1)
    assert.match(p.blockers.join('\n'), /overridden would move \(tier_override loyalty_club\): 15% -> 10%/)
    const before = structuredClone(fake.tables)
    await assert.rejects(service.applyPilotSwitch(p), /Refusing to switch/)
    assert.deepEqual(fake.tables, before)
  })

  it('blocks a currency that is not the studio currency, and a currency with no default bonus', async () => {
    seed({ studios: [pilotStudio(STUDIO_ID, 'eur'), pilotStudio(OTHER_STUDIO_ID, 'dkk')] })
    assert.match((await plan({ currency: 'SEK' })).blockers.join(), /does not match the studio currency EUR/)
    assert.match((await plan({}, OTHER_STUDIO_ID)).blockers.join(), /No default welcome bonus for currency DKK/)
    assert.deepEqual((await plan({ welcomeBonus: 185 }, OTHER_STUDIO_ID)).blockers, [])
  })

  it('returns null for a studio that is not in Loyalink', async () => {
    seed()
    assert.equal(await service.loadPilotSwitchInput('no-such-studio'), null)
  })
})

describe('applyPilotSwitch', () => {
  it('leaves every existing member and promotion as it was, records the switch, touches no other studio', async () => {
    const fake = seed()
    const before = structuredClone(fake.tables)
    const result = await switchStudio()
    assert.equal(result.pinned, 1)

    const strip = (rows: Row[]) => rows.filter((r) => r.id !== 'no-rate')
    assert.deepEqual(strip(fake.rows('customers')), strip(before.customers))
    assert.deepEqual(fake.rows('member_promotions'), before.member_promotions)
    assert.equal(Number(fake.row('customers', 'no-rate').cashback_rate), 7.5)
    assert.equal(fake.row('customers', 'no-rate').loyalty_stage, 'base')
    assert.deepEqual(fake.rows('analytics_events'), [])
    assert.deepEqual(fetchStub.urls, [], 'no pass push, webhook or email')
    assert.deepEqual(fake.row('studios', OTHER_STUDIO_ID), before.studios.find((s) => s.id === OTHER_STUDIO_ID))

    const settings = fake.row('studios', STUDIO_ID).settings as Row
    const config = savedConfig(fake)
    assert.equal(config.tiers[0].cashback_rate, 5)
    assert.ok(config.pilot_switched_at)
    const record = settings.pilot_switch as Row
    assert.equal(record.switched_at, config.pilot_switched_at)
    assert.equal(record.friend_welcome_bonus, 25)
    assert.equal(record.mode, 'full')
    assert.deepEqual(record.rates, { base: 5, after_tattoo: 10, giver: 15 })
    assert.equal(record.currency, 'EUR')
    assert.deepEqual(record.tier_slugs, { base: 'base', after_tattoo: 'loyalty_club', giver: 'inner_circle' })
    assert.deepEqual(record.previous_rewards_config, ALL_INK_CONFIG)
    assert.equal(settings.currency, 'eur', 'other settings kept')

    // Twice is refused.
    const again = await plan()
    assert.match(again.blockers.join(), /Already switched/)
  })

  it('refuses when the config changed after the dry run', async () => {
    const fake = seed()
    const p = await plan()
    const settings = fake.row('studios', STUDIO_ID).settings as Row
    settings.rewards_config = { ...ALL_INK_CONFIG, enabled: false }
    await assert.rejects(service.applyPilotSwitch(p), /changed since the dry run/)
  })
})

describe('after the switch', () => {
  it('a new member joins on the 5% base tier', async () => {
    const fake = seed()
    await switchStudio()
    const { customerId } = await members.createMember({ studioId: STUDIO_ID, name: 'New Client' })
    const row = fake.row('customers', customerId)
    assert.equal(row.loyalty_stage, 'base')
    assert.equal(Number(row.cashback_rate), 5)
    assert.equal(Number(row.balance ?? 0), 0)
    assert.deepEqual(fake.rows('referrals'), [])
  })

  it('a friend joins on the 10% tier with the welcome bonus; the giver gets no Loyalink bonus or commission', async () => {
    const fake = seed()
    await switchStudio()
    const { customerId: friendId } = await members.createMember({ studioId: STUDIO_ID, name: 'Friend', referralCode: 'giver002' })
    const friend = fake.row('customers', friendId)
    assert.equal(friend.loyalty_stage, 'loyalty_club')
    assert.equal(Number(friend.cashback_rate), 10)
    assert.equal(Number(friend.balance), 25)
    const [referral] = fake.rows('referrals')
    assert.equal(referral.referrer_customer_id, 'club')
    assert.equal(referral.status, 'pending')

    // A deposit does not activate the referral.
    await transactions.processTransaction({ customerId: friendId, studioId: STUDIO_ID, amount: 100, isDeposit: true })
    assert.equal(fake.rows('referrals')[0].status, 'pending')

    // The first full payment does. The giver keeps 15%, gets no commission.
    await transactions.processTransaction({ customerId: friendId, studioId: STUDIO_ID, amount: 1000 })
    assert.equal(fake.rows('referrals')[0].status, 'activated')
    const giver = fake.row('customers', 'club')
    assert.equal(Number(giver.cashback_rate), 15)
    assert.equal(giver.referral_count, 1)
    assert.equal(Number(giver.balance), 0)
    assert.deepEqual(fake.rows('transactions').filter((t) => t.type === 'referral_commission'), [])
  })

  it('never auto-upgrades the giver to inner_circle, on a referral or on spend', async () => {
    const fake = seed()
    await switchStudio()
    const { customerId: friendId } = await members.createMember({ studioId: STUDIO_ID, name: 'Friend', referralCode: 'GIVER002' })
    await transactions.processTransaction({ customerId: friendId, studioId: STUDIO_ID, amount: 1000 })
    assert.equal(fake.row('customers', 'club').referral_count, 1)

    // The giver buys after the referral activated, and spends big.
    await transactions.processTransaction({ customerId: 'club', studioId: STUDIO_ID, amount: 1000 })
    await transactions.processTransaction({ customerId: 'club', studioId: STUDIO_ID, amount: 50000 })
    const giver = fake.row('customers', 'club')
    assert.equal(giver.loyalty_stage, 'loyalty_club')
    assert.equal(Number(giver.cashback_rate), 15)
    // The friend spends big too and stays on the 10% tier.
    await transactions.processTransaction({ customerId: friendId, studioId: STUDIO_ID, amount: 50000 })
    assert.equal(fake.row('customers', friendId).loyalty_stage, 'loyalty_club')
    assert.deepEqual(fake.rows('analytics_events').filter((e) => e.event_type === 'tier_change' && (e.metadata as Row).to_tier === 'inner_circle'), [])
  })

  it('an existing member still earns their own rate', async () => {
    const fake = seed()
    await switchStudio()
    await transactions.processTransaction({ customerId: 'club', studioId: STUDIO_ID, amount: 1000 })
    const credit = fake.rows('transactions').find((t) => t.customer_id === 'club' && t.type === 'cashback')
    assert.equal(Number(credit?.amount), 150)
  })
})

describe('transaction.created payload', () => {
  it('carries amount, cash amount, deposit flag, time, ids and the customer', async () => {
    // A .invalid host never resolves, so delivery is blocked and the payload
    // is logged to webhook_deliveries without leaving the process.
    const fake = seed({ studio_webhooks: [{ id: 'hook', studio_id: STUDIO_ID, url: 'https://streamink.invalid/hook', events: ['transaction.created'], active: true }] })
    await transactions.processTransaction({ customerId: 'club', studioId: STUDIO_ID, amount: 1000, cashAmount: 800, isDeposit: false, sourceTransactionId: 'src-1' })
    const delivery = fake.rows('webhook_deliveries').find((d) => d.event === 'transaction.created')
    assert.ok(delivery, 'no transaction.created delivery logged')
    const payload = delivery.payload as { customer_id: string; data: Row }
    assert.equal(payload.customer_id, 'club')
    const data = payload.data
    assert.equal(data.transaction_id, 'src-1')
    assert.equal(data.source_transaction_id, 'src-1')
    assert.equal(data.amount, 1000)
    assert.equal(data.amount_cents, 100000)
    assert.equal(data.cash_amount, 800)
    assert.equal(data.payment_type, 'full_payment')
    assert.equal(data.is_deposit, false)
    assert.equal(data.customer_id, 'club')
    assert.equal((data.customer as Row).id, 'club')
    assert.equal(typeof data.transacted_at, 'string')
    const credit = fake.rows('transactions').find((t) => t.customer_id === 'club' && t.type === 'cashback')
    assert.equal(data.cashback_transaction_id, credit?.id)
  })
})

// Ink Nation's config on 2026-10-02 (SEK, tiers 5 / 7.5 / 10).
const INK_NATION_CONFIG = {
  ...ALL_INK_CONFIG,
  tiers: [
    { slug: 'base', name: 'Base', cashback_rate: 5, unlocks_referrals: true },
    { slug: 'loyalty_club', name: 'Loyalty Club', cashback_rate: 7.5, upgrade_trigger: { type: 'first_full_payment' }, unlocks_referrals: false },
    { slug: 'inner_circle', name: 'Inner Circle', cashback_rate: 10, upgrade_trigger: { type: 'referral_count', threshold: 3 }, unlocks_referrals: false },
  ],
  referrals: {
    ...ALL_INK_CONFIG.referrals,
    friend_tier_slug: 'loyalty_club',
    friend_cashback_rate: 7.5,
    friend_welcome_bonus: 150,
    referrer_cashback_cap: 15,
    referrer_commission_rate: 0,
    referrer_commission_duration_days: 0,
  },
}

describe('referral-only mode (current studios)', () => {
  const inkNation = () => seed({ studios: [pilotStudio(STUDIO_ID, 'sek', INK_NATION_CONFIG), pilotStudio(OTHER_STUDIO_ID)] })

  it('changes only the gift/referral rules; tiers and the friend tier stay', async () => {
    inkNation()
    const p = await plan({ mode: 'referral_only' })
    assert.deepEqual(p.blockers, [])
    assert.equal(p.welcomeBonus, 250)
    assert.deepEqual(p.target.tiers, p.current.tiers)
    assert.deepEqual(p.diff.map((d) => d.path).sort(), [
      'referrals.activation_trigger.type',
      'referrals.friend_welcome_bonus',
      'referrals.referrer_cashback_bonus_per_ref',
    ])
    assert.equal(p.target.referrals.friend_tier_slug, 'loyalty_club')
    assert.equal(p.target.referrals.referrer_commission_rate, 0)
    assert.equal(p.members.keep, p.members.total - p.members.pin.length)
    assert.deepEqual(p.members.change, [])
    assert.deepEqual(p.upgradePath, [])
  })

  it('apply leaves every member and promotion as it was and records the mode', async () => {
    const fake = inkNation()
    const before = structuredClone(fake.tables)
    const p = await plan({ mode: 'referral_only' })
    await service.applyPilotSwitch(p)
    const strip = (rows: Row[]) => rows.filter((r) => r.id !== 'no-rate')
    assert.deepEqual(strip(fake.rows('customers')), strip(before.customers))
    assert.deepEqual(fake.rows('member_promotions'), before.member_promotions)
    const settings = fake.row('studios', STUDIO_ID).settings as Row
    const record = settings.pilot_switch as Row
    assert.equal(record.mode, 'referral_only')
    assert.equal(record.friend_welcome_bonus, 250)
    assert.equal(record.currency, 'SEK')
    assert.deepEqual(record.rates, { base: 5, after_tattoo: 7.5, giver: 10 })
    assert.deepEqual(savedConfig(fake).tiers, migrateRewardsConfig(INK_NATION_CONFIG).tiers)
    assert.ok(savedConfig(fake).pilot_switched_at)
  })

  it('a friend gets 250 from Loyalink on the studio friend tier; the giver gets no bonus', async () => {
    const fake = inkNation()
    await service.applyPilotSwitch(await plan({ mode: 'referral_only' }))
    const { customerId: friendId } = await members.createMember({ studioId: STUDIO_ID, name: 'Friend', referralCode: 'GIVER002' })
    const friend = fake.row('customers', friendId)
    assert.equal(friend.loyalty_stage, 'loyalty_club')
    assert.equal(Number(friend.cashback_rate), 7.5)
    assert.equal(Number(friend.balance), 250)
    await transactions.processTransaction({ customerId: friendId, studioId: STUDIO_ID, amount: 100, isDeposit: true })
    assert.equal(fake.rows('referrals')[0].status, 'pending')
    await transactions.processTransaction({ customerId: friendId, studioId: STUDIO_ID, amount: 1000 })
    assert.equal(fake.rows('referrals')[0].status, 'activated')
    assert.equal(Number(fake.row('customers', 'club').cashback_rate), 15)
  })
})

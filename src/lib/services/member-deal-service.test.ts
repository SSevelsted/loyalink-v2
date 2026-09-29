// The best-deal rule and the row it implies. Pure functions. Run with `npm test`.
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setTestEnv } from '@/test/fake-supabase'

type Service = typeof import('./member-deal-service')
let deal: Service

const TIERS = [
  { slug: 'base', cashback_rate: 7.5 },
  { slug: 'loyalty_club', cashback_rate: 15 },
  { slug: 'inner_circle', cashback_rate: 20 },
]

const boost = (rate: number | string | null) => ({ type: 'cashback_boost' as const, cashback_rate: rate, tier_slug: null })
const override = (tier: string | null) => ({ type: 'tier_override' as const, cashback_rate: null, tier_slug: tier })

before(async () => {
  setTestEnv()
  deal = await import('./member-deal-service')
})

describe('effectiveCashbackRate', () => {
  it('no promotion: the fallback rate', () => {
    assert.equal(deal.effectiveCashbackRate(null, 7.5, TIERS), 7.5)
  })

  it('cashback_boost: the higher of the boost and the fallback', () => {
    assert.equal(deal.effectiveCashbackRate(boost(20), 7.5, TIERS), 20)
    assert.equal(deal.effectiveCashbackRate(boost(5), 7.5, TIERS), 7.5)
    assert.equal(deal.effectiveCashbackRate(boost('12.5'), 7.5, TIERS), 12.5, 'NUMERIC comes back as a string')
  })

  it('cashback_boost without a rate: the fallback', () => {
    assert.equal(deal.effectiveCashbackRate(boost(null), 7.5, TIERS), 7.5)
  })

  it('tier_override: the higher of the override tier\'s rate and the fallback', () => {
    assert.equal(deal.effectiveCashbackRate(override('inner_circle'), 7.5, TIERS), 20)
    assert.equal(deal.effectiveCashbackRate(override('loyalty_club'), 20, TIERS), 20)
  })

  it('tier_override on a tier the config does not have: the fallback', () => {
    assert.equal(deal.effectiveCashbackRate(override('gone'), 7.5, TIERS), 7.5)
  })
})

describe('promotionPays', () => {
  it('only when the promotion beats the fallback', () => {
    assert.equal(deal.promotionPays(boost(20), 7.5, TIERS), true)
    assert.equal(deal.promotionPays(boost(7.5), 7.5, TIERS), false)
    assert.equal(deal.promotionPays(boost(5), 7.5, TIERS), false)
    assert.equal(deal.promotionPays(null, 7.5, TIERS), false)
  })
})

describe('dealRow', () => {
  it('cashback_boost: own tier, best-deal rate', () => {
    assert.deepEqual(deal.dealRow(boost(20), 'loyalty_club', 15, TIERS, 'loyalty_club'), { loyalty_stage: 'loyalty_club', cashback_rate: 20 })
  })

  it('tier_override: override tier, best-deal rate', () => {
    assert.deepEqual(deal.dealRow(override('loyalty_club'), 'inner_circle', 20, TIERS, 'loyalty_club'), { loyalty_stage: 'loyalty_club', cashback_rate: 20 })
  })

  it('no promotion: the permanent tier and rate', () => {
    assert.deepEqual(deal.dealRow(null, 'base', 7.5, TIERS, 'base'), { loyalty_stage: 'base', cashback_rate: 7.5 })
  })
})

describe('permanentDeal', () => {
  it('reads the promotion\'s fallback while one runs, else the row', () => {
    const row = { loyalty_stage: 'inner_circle', cashback_rate: 20 }
    assert.deepEqual(deal.permanentDeal(row, { original_tier_slug: 'base', original_cashback_rate: '7.5' }, TIERS), { tier: 'base', rate: 7.5 })
    assert.deepEqual(deal.permanentDeal(row, null, TIERS), { tier: 'inner_circle', rate: 20 })
  })

  it('a row without a rate falls back to its tier\'s rate', () => {
    assert.deepEqual(deal.permanentDeal({ loyalty_stage: 'loyalty_club', cashback_rate: null }, null, TIERS), { tier: 'loyalty_club', rate: 15 })
  })
})

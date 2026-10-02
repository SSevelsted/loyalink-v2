// Run with `npm test`.
//
// Before this fix the member page treated every adjustment as money out: a
// +25 gift bonus showed as a red "-25".
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { amountSign, memberTransactionLabel, signedTransactionAmount, WELCOME_BONUS_DESCRIPTION } from './transaction-display'
import { getLoyaltyTranslations } from './loyalty-translations'

describe('signedTransactionAmount', () => {
  it('a positive adjustment (gift or welcome bonus) is positive', () => {
    assert.equal(signedTransactionAmount('adjustment', 25), 25)
    assert.equal(amountSign(signedTransactionAmount('adjustment', 25)), '+')
  })

  it('a negative adjustment stays negative', () => {
    assert.equal(signedTransactionAmount('adjustment', -10), -10)
    assert.equal(amountSign(-10), '−')
  })

  it('a debit always subtracts, whichever sign was stored', () => {
    assert.equal(signedTransactionAmount('debit', 28), -28)
    assert.equal(signedTransactionAmount('debit', -28), -28)
  })

  it('credit, cashback and referral commission show as stored', () => {
    assert.equal(signedTransactionAmount('credit', 1000), 1000)
    assert.equal(signedTransactionAmount('cashback', '75.5'), 75.5)
    assert.equal(signedTransactionAmount('referral_commission', 50), 50)
  })

  it('a missing or bad amount reads as 0', () => {
    assert.equal(signedTransactionAmount('adjustment', null), 0)
    assert.equal(signedTransactionAmount('adjustment', 'x'), 0)
  })
})

describe('memberTransactionLabel', () => {
  const en = getLoyaltyTranslations('en').transactionLabels
  const de = getLoyaltyTranslations('de').transactionLabels

  it('the referral welcome bonus gets a translated label', () => {
    const tx = { type: 'adjustment', amount: 25, description: WELCOME_BONUS_DESCRIPTION }
    assert.equal(memberTransactionLabel(tx, en), en.welcome_bonus)
    assert.equal(memberTransactionLabel(tx, de), de.welcome_bonus)
    assert.notEqual(de.welcome_bonus, en.welcome_bonus)
  })

  it('a description a person wrote is shown as is', () => {
    assert.equal(memberTransactionLabel({ type: 'adjustment', amount: 25, description: 'Gift from Ana' }, en), 'Gift from Ana')
  })

  it('a system description becomes "bonus added" or "balance adjustment" by sign', () => {
    assert.equal(memberTransactionLabel({ type: 'adjustment', amount: 25, description: 'api credit' }, en), en.bonus_added)
    assert.equal(memberTransactionLabel({ type: 'adjustment', amount: -5, description: 'Manual debit' }, en), en.adjustment)
    assert.equal(memberTransactionLabel({ type: 'adjustment', amount: 25, description: null }, en), en.bonus_added)
  })

  it('other types use the type label', () => {
    assert.equal(memberTransactionLabel({ type: 'cashback', amount: 10, description: 'whatever' }, en), en.cashback)
  })

  it('every language has the new labels', () => {
    for (const lang of ['en', 'da', 'sv', 'no', 'nb', 'de', 'fr', 'es', 'nl', 'pl']) {
      const labels = getLoyaltyTranslations(lang).transactionLabels
      assert.ok(labels.welcome_bonus, `${lang} welcome_bonus`)
      assert.ok(labels.bonus_added, `${lang} bonus_added`)
    }
  })
})

describe('gift counter copy', () => {
  it('every language has it, never says earn, has no em dash', () => {
    for (const lang of ['en', 'da', 'sv', 'no', 'nb', 'de', 'fr', 'es', 'nl', 'pl']) {
      const t = getLoyaltyTranslations(lang)
      const copy = [t.giftsTitle, t.giftsReady(1), t.giftsReady(5), t.giftsGivenSoFar(1), t.giftsGivenSoFar(12)]
      for (const text of copy) {
        assert.ok(text && !text.includes('\u2014'), `${lang}: ${text}`)
        assert.ok(!/earn/i.test(text), `${lang}: ${text}`)
      }
    }
    assert.equal(getLoyaltyTranslations('en').giftsReady(1), 'You have 1 gift to give')
    assert.equal(getLoyaltyTranslations('pl').giftsReady(3), 'Masz 3 prezenty do podarowania')
    assert.equal(getLoyaltyTranslations('pl').giftsReady(5), 'Masz 5 prezentów do podarowania')
  })
})

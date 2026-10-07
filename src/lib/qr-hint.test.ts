import { test } from 'node:test'
import assert from 'node:assert/strict'
import { friendGiftAmountOn, qrHintOnFromStaticTexts } from './qr-hint'

test('designer toggle is on unless turned off', () => {
  assert.equal(qrHintOnFromStaticTexts(null), true)
  assert.equal(qrHintOnFromStaticTexts({}), true)
  assert.equal(qrHintOnFromStaticTexts({ qrHint: true }), true)
  assert.equal(qrHintOnFromStaticTexts({ qrHint: false }), false)
})

test('the line needs a friend gift amount', () => {
  assert.equal(friendGiftAmountOn({ enabled: true, friend_welcome_bonus: 25 }), true)
  assert.equal(friendGiftAmountOn({ enabled: true, friend_welcome_bonus: 0 }), false)
  assert.equal(friendGiftAmountOn({ enabled: false, friend_welcome_bonus: 25 }), false)
  assert.equal(friendGiftAmountOn(undefined), false)
})

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendGiftOnFromSettings, qrHintText, qrHintToggleOn } from './qrHint.js';

test('QR line per language, English fallback, no em dash, short', () => {
  assert.equal(qrHintText('da'), 'Lad en ven scanne for en gave');
  assert.equal(qrHintText('SV'), 'Låt en vän skanna för en gåva');
  assert.equal(qrHintText('pt'), 'Let a friend scan for a gift');
  assert.equal(qrHintText(undefined), 'Let a friend scan for a gift');
  for (const l of ['en', 'da', 'sv', 'no', 'nb', 'de', 'fr', 'es', 'nl', 'pl']) {
    assert.ok(!qrHintText(l).includes('—'), l);
  }
});

test('QR line only where friends get a gift with an amount', () => {
  assert.equal(friendGiftOnFromSettings({ rewards_config: { referrals: { enabled: true, friend_welcome_bonus: 25 } } }), true);
  assert.equal(friendGiftOnFromSettings({ rewards_config: { referrals: { enabled: true, friend_welcome_bonus: 0 } } }), false);
  assert.equal(friendGiftOnFromSettings({ rewards_config: { referrals: { enabled: false, friend_welcome_bonus: 25 } } }), false);
  assert.equal(friendGiftOnFromSettings({ rewards_config: { referrals: { friend_welcome_bonus: '250' } } }), true);
  assert.equal(friendGiftOnFromSettings(null), false);
});

test('card designer toggle: on unless turned off', () => {
  assert.equal(qrHintToggleOn(null), true);
  assert.equal(qrHintToggleOn({ qrHint: true }), true);
  assert.equal(qrHintToggleOn({ qrHint: false }), false);
});

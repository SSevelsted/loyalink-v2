import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendGiftOnFromSettings, qrHintText } from './qrHint.js';

test('QR line per language, English fallback, no em dash', () => {
  assert.equal(qrHintText('da'), 'Venner scanner her og får deres gave');
  assert.equal(qrHintText('SV'), 'Vänner skannar här och får sin gåva');
  assert.equal(qrHintText('pt'), 'Friends scan this to get their gift');
  assert.equal(qrHintText(undefined), 'Friends scan this to get their gift');
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

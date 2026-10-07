// Pure wallet-message helpers. Run with `npm test` in pass-service/.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAddMessagePayload,
  buildGoogleMessageId,
  chunk,
  firstName,
  giftLinkLabel,
  hasAnyMessage,
  isGoogleQuotaError,
  mapPool,
  memberGiftUrl,
  renderMessageTokens,
  resolveCustomerMessage,
} from './walletMessages.js';

describe('chunk', () => {
  it('splits 2,500 ids into 13 chunks of max 200', () => {
    const ids = Array.from({ length: 2500 }, (_, i) => i);
    const parts = chunk(ids);
    assert.equal(parts.length, 13);
    assert.ok(parts.every((p) => p.length <= 200));
    assert.deepEqual(parts.flat(), ids);
  });

  it('handles an empty list and a custom size', () => {
    assert.deepEqual(chunk([]), []);
    assert.deepEqual(chunk(['a', 'b', 'c'], 2), [['a', 'b'], ['c']]);
  });
});

describe('token rendering', () => {
  it('firstName takes the first word', () => {
    assert.equal(firstName('  Maja  Holm Jensen '), 'Maja');
    assert.equal(firstName(null), '');
  });

  it('renders {first_name} everywhere it appears', () => {
    assert.equal(renderMessageTokens('Hi {first_name}! {first_name}, look.', { firstName: 'Maja' }), 'Hi Maja! Maja, look.');
  });

  it('drops the token and the stray space when there is no name', () => {
    assert.equal(renderMessageTokens('Hi {first_name}, your gift is ready.', { firstName: '' }), 'Hi, your gift is ready.');
    assert.equal(renderMessageTokens('Hi {first_name}! Welcome', { firstName: null }), 'Hi! Welcome');
  });

  it('leaves text without tokens unchanged', () => {
    assert.equal(renderMessageTokens('No tokens here', { firstName: 'Maja' }), 'No tokens here');
  });
});

describe('resolveCustomerMessage', () => {
  it('uses pushMessage with the customer first name', () => {
    assert.deepEqual(resolveCustomerMessage({ pushMessage: 'Hi {first_name}', pushHeader: 'Studio' }, 'c1', 'Maja Holm'), {
      header: 'Studio',
      body: 'Hi Maja',
    });
  });

  it('messagesByCustomer wins over pushMessage', () => {
    const input = { pushMessage: 'Hi all', messagesByCustomer: { c1: { body: 'Just you, {first_name}', header: 'For you' } } };
    assert.deepEqual(resolveCustomerMessage(input, 'c1', 'Maja'), { header: 'For you', body: 'Just you, Maja' });
    assert.deepEqual(resolveCustomerMessage(input, 'c2', 'Ole'), { header: undefined, body: 'Hi all' });
  });

  it('is null when the send carries no text', () => {
    assert.equal(resolveCustomerMessage({}, 'c1', 'Maja'), null);
    assert.equal(resolveCustomerMessage({ pushMessage: '   ' }, 'c1', 'Maja'), null);
    assert.equal(hasAnyMessage({}), false);
    assert.equal(hasAnyMessage({ messagesByCustomer: { c1: { body: 'x' } } }), true);
  });
});

describe('Google addMessage payload', () => {
  const now = new Date('2026-10-05T10:00:00.000Z');

  it('is TEXT_AND_NOTIFY with an end date 30 days out by default', () => {
    assert.deepEqual(buildAddMessagePayload({ id: 'campaign_1_c1', header: 'Ink Studio', body: 'Hi Maja' }, now), {
      message: {
        id: 'campaign_1_c1',
        header: 'Ink Studio',
        body: 'Hi Maja',
        messageType: 'TEXT_AND_NOTIFY',
        displayInterval: { end: { date: '2026-11-04T10:00:00.000Z' } },
      },
    });
  });

  it('uses an explicit end date', () => {
    const payload = buildAddMessagePayload({ id: 'x', header: 'h', body: 'b', endAt: '2026-10-10T00:00:00.000Z' }, now);
    assert.equal(payload.message.displayInterval.end.date, '2026-10-10T00:00:00.000Z');
  });

  it('message id joins send id and customer id and strips unsafe characters', () => {
    assert.equal(buildGoogleMessageId('campaign_abc', 'c-1'), 'campaign_abc_c-1');
    assert.equal(buildGoogleMessageId('promo #1/2', 'c1'), 'promo__1_2_c1');
  });

  it('flags 429 and quota errors as not retryable', () => {
    assert.equal(isGoogleQuotaError(429, ''), true);
    assert.equal(isGoogleQuotaError(400, '{"error":{"status":"RESOURCE_EXHAUSTED"}}'), true);
    assert.equal(isGoogleQuotaError(400, 'Quota exceeded for notifications'), true);
    assert.equal(isGoogleQuotaError(404, 'not found'), false);
  });
});

describe('gift link', () => {
  it('has the same URL as the Apple back field', () => {
    assert.equal(memberGiftUrl('https://loyalink.ai', 'M1', 'tok'), 'https://loyalink.ai/loyalty/M1?token=tok');
    assert.equal(memberGiftUrl('https://loyalink.ai', 'M1'), 'https://loyalink.ai/loyalty/M1');
  });

  it('is localized, falls back to English and has no em dash', () => {
    assert.equal(giftLinkLabel('da'), 'Giv en gave til en ven');
    assert.equal(giftLinkLabel('sv'), 'Ge en gåva till en vän');
    assert.equal(giftLinkLabel('de'), 'Schenk einem Freund ein Geschenk');
    assert.equal(giftLinkLabel('nb'), 'Gi en gave til en venn');
    assert.equal(giftLinkLabel('xx'), 'Give a gift to a friend');
    assert.equal(giftLinkLabel(undefined), 'Give a gift to a friend');
    for (const lang of ['en', 'da', 'sv', 'de', 'no', 'nb', 'fr', 'es', 'nl', 'pl']) {
      assert.ok(!giftLinkLabel(lang).includes('—'), lang);
    }
  });
});

describe('mapPool', () => {
  it('keeps order and never exceeds the limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return n * 2;
    });
    assert.deepEqual(out, [2, 4, 6, 8, 10, 12, 14]);
    assert.ok(peak <= 3);
  });
});

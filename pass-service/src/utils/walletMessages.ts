// Pure helpers for wallet-pass messages. No network, no config import, so the
// tests run without Supabase or Google credentials.

/** Max ids per `.in()` filter. Keeps the PostgREST URL short and each page well under the 1000-row cap. */
export const IN_CHUNK_SIZE = 200;

/** Split a list into chunks of at most `size` items. */
export function chunk<T>(items: readonly T[], size: number = IN_CHUNK_SIZE): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error(`chunk size must be a positive integer, got ${size}`);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** First word of a customer's name, or '' when there is none. */
export function firstName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().split(/\s+/)[0] ?? '';
}

/**
 * Render {first_name} in a message. A member with no name gets the token
 * removed, and the spacing around it is cleaned up ("Hi {first_name}, ..."
 * becomes "Hi, ..."), so nobody reads a raw token or a stray space.
 */
export function renderMessageTokens(text: string, vars: { firstName?: string | null }): string {
  const name = (vars.firstName ?? '').trim();
  if (!text.includes('{first_name}')) return text;
  if (name) return text.split('{first_name}').join(name);
  return text
    .split('{first_name}')
    .join('')
    .replace(/[ \t]+([,.!?;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export type WalletMessageInput = {
  pushMessage?: string;
  pushHeader?: string;
  messagesByCustomer?: Record<string, { header?: string; body: string }>;
};

export type ResolvedMessage = { header?: string; body: string };

/**
 * The message one customer gets, or null when the send carries no text.
 * messagesByCustomer wins over pushMessage. Tokens are rendered here.
 */
export function resolveCustomerMessage(
  input: WalletMessageInput,
  customerId: string,
  customerName: string | null | undefined,
): ResolvedMessage | null {
  const own = input.messagesByCustomer?.[customerId];
  const rawBody = own?.body ?? input.pushMessage;
  if (typeof rawBody !== 'string' || !rawBody.trim()) return null;
  const vars = { firstName: firstName(customerName) };
  const rawHeader = own?.header ?? input.pushHeader;
  const header = typeof rawHeader === 'string' && rawHeader.trim() ? renderMessageTokens(rawHeader.trim(), vars) : undefined;
  return { header, body: renderMessageTokens(rawBody.trim(), vars) };
}

/** True when the request carries any message text at all. */
export function hasAnyMessage(input: WalletMessageInput): boolean {
  if (typeof input.pushMessage === 'string' && input.pushMessage.trim()) return true;
  return Object.values(input.messagesByCustomer ?? {}).some((m) => typeof m?.body === 'string' && m.body.trim());
}

/**
 * Google message id. Must be unique per message on one object, so it joins
 * the send id (campaign, automation or explicit id) with the customer id.
 * Google ids allow letters, digits, '.', '_' and '-'; anything else becomes '_'.
 */
export function buildGoogleMessageId(sendId: string, customerId: string): string {
  return `${sendId}_${customerId}`.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
}

export const GOOGLE_MESSAGE_DEFAULT_DAYS = 30;

export type GoogleMessage = { id: string; header: string; body: string; endAt?: Date | string };

/** Body for POST loyaltyObject/{id}/addMessage. TEXT_AND_NOTIFY makes the phone show a notification. */
export function buildAddMessagePayload(message: GoogleMessage, now: Date = new Date()) {
  const end = message.endAt
    ? new Date(message.endAt)
    : new Date(now.getTime() + GOOGLE_MESSAGE_DEFAULT_DAYS * 24 * 60 * 60 * 1000);
  return {
    message: {
      id: message.id,
      header: message.header,
      body: message.body,
      messageType: 'TEXT_AND_NOTIFY',
      displayInterval: { end: { date: end.toISOString() } },
    },
  };
}

/**
 * True for Google's notification limit (max 3 notifying messages per pass per
 * 24 h) and plain rate limits. These must not be retried.
 */
export function isGoogleQuotaError(status: number, body: string): boolean {
  if (status === 429) return true;
  return /quota|rate ?limit|too many|RESOURCE_EXHAUSTED/i.test(body);
}

/** Label for the member's own gift link on the Google pass. Unknown languages get English. */
const GIFT_LINK_LABELS: Record<string, string> = {
  en: 'Give a gift to a friend',
  da: 'Giv en gave til en ven',
  sv: 'Ge en gåva till en vän',
  de: 'Schenk einem Freund ein Geschenk',
  no: 'Gi en gave til en venn',
  nb: 'Gi en gave til en venn',
  fr: 'Offrez un cadeau à un ami',
  es: 'Regala algo a un amigo',
  nl: 'Geef een vriend een cadeau',
  pl: 'Podaruj prezent znajomemu',
};

export function giftLinkLabel(language?: string | null): string {
  if (!language) return GIFT_LINK_LABELS.en;
  const code = language.toLowerCase().split('-')[0];
  return GIFT_LINK_LABELS[code] ?? GIFT_LINK_LABELS.en;
}

/** Same URL as the Apple back field 'referral' (applePassService). */
export function memberGiftUrl(appUrl: string, memberId: string, memberLinkToken?: string): string {
  return `${appUrl}/loyalty/${memberId}${memberLinkToken ? `?token=${memberLinkToken}` : ''}`;
}

/** Run `fn` over `items` with at most `limit` calls in flight. Results keep input order. */
export async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

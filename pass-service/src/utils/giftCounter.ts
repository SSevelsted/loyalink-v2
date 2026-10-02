import { supabase } from '../config.js';

// "5 gifts to give" on the pass. Mirrors src/lib/gift-counter.ts in the app:
// gifts given = the member's referral rows as referrer; a new round of 5
// starts after the 5th, so the number is 1..5, never 0. Off (null) unless the
// studio sets rewards_config.referrals.gift_counter_enabled = true.

export const GIFTS_PER_ROUND = 5;

export function giftsReadyFromTotal(total: number): number {
  const given = Math.max(0, Math.floor(Number(total) || 0));
  return GIFTS_PER_ROUND - (given % GIFTS_PER_ROUND);
}

/** Gifts ready for this member, or null when the studio switch is off or the lookup fails. */
export async function loadGiftsReady(studioId: string, customerId: string): Promise<number | null> {
  try {
    const { data: studio } = await supabase.from('studios').select('settings').eq('id', studioId).maybeSingle();
    const settings = studio?.settings as { rewards_config?: { referrals?: { gift_counter_enabled?: unknown } } } | null;
    if (settings?.rewards_config?.referrals?.gift_counter_enabled !== true) return null;

    const { count, error } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studioId)
      .eq('referrer_customer_id', customerId);
    if (error) {
      console.error('[gifts] count failed', { studioId, customerId, message: error.message });
      return null;
    }
    return giftsReadyFromTotal(count ?? 0);
  } catch (err) {
    console.error('[gifts] lookup threw', { studioId, customerId, err });
    return null;
  }
}

// Pass copy: gifts the member gives to friends. Unknown languages fall back to English.
const GIFT_COPY: Record<string, { label: string; of: string }> = {
  en: { label: 'Gifts to give', of: 'of' },
  da: { label: 'Gaver at give', of: 'af' },
  sv: { label: 'Gåvor att ge', of: 'av' },
  no: { label: 'Gaver å gi', of: 'av' },
  nb: { label: 'Gaver å gi', of: 'av' },
  de: { label: 'Geschenke zum Verschenken', of: 'von' },
  fr: { label: 'Cadeaux à offrir', of: 'sur' },
  es: { label: 'Regalos para dar', of: 'de' },
  nl: { label: 'Cadeaus om te geven', of: 'van' },
  pl: { label: 'Prezenty do podarowania', of: 'z' },
};

/** { label, value } for the pass, e.g. "Gifts to give" / "3 of 5". */
export function giftPassField(giftsReady: number, language?: string): { label: string; value: string } {
  const copy = GIFT_COPY[(language ?? 'en').toLowerCase()] ?? GIFT_COPY.en;
  return { label: copy.label, value: `${giftsReady} ${copy.of} ${GIFTS_PER_ROUND}` };
}

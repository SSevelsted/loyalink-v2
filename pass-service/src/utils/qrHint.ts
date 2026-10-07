// The line under the QR code on the card: friends scan it to get their gift.
// The QR opens /refer/{memberId}, the friend's gift page. Shown only where the
// studio gives a friend a gift with an amount (referrals on and a
// friend_welcome_bonus above 0), so the card never promises a gift that is not
// there, and only while the card designer toggle is on (missing = on). Unknown languages fall back to English. No em dashes.

const QR_HINT: Record<string, string> = {
  en: 'Friends scan this to get their gift',
  da: 'Venner scanner her og får deres gave',
  sv: 'Vänner skannar här och får sin gåva',
  no: 'Venner skanner her og får gaven sin',
  nb: 'Venner skanner her og får gaven sin',
  de: 'Freunde scannen hier und bekommen ihr Geschenk',
  fr: 'Vos amis scannent ici pour recevoir leur cadeau',
  es: 'Tus amigos escanean aquí para recibir su regalo',
  nl: 'Vrienden scannen hier voor hun cadeau',
  pl: 'Znajomi skanują tutaj, aby odebrać prezent',
};

export function qrHintText(language?: string | null): string {
  return QR_HINT[(language ?? 'en').toLowerCase()] ?? QR_HINT.en;
}

/** True when friends get a gift with an amount at this studio. Pure. */
export function friendGiftOnFromSettings(settings: unknown): boolean {
  const s = settings as { rewards_config?: { referrals?: { enabled?: unknown; friend_welcome_bonus?: unknown } } } | null;
  const referrals = s?.rewards_config?.referrals;
  if (!referrals || referrals.enabled === false) return false;
  const bonus = Number(referrals.friend_welcome_bonus);
  return Number.isFinite(bonus) && bonus > 0;
}

/** The card designer toggle (pass_templates.static_texts.qrHint): on unless false. Pure. */
export function qrHintToggleOn(staticTexts: unknown): boolean {
  const t = staticTexts as { qrHint?: unknown } | null;
  return !(t && typeof t === 'object' && t.qrHint === false);
}

/** Whether the card shows the QR line for this studio. False on any read error. */
export async function loadFriendGiftOn(studioId: string): Promise<boolean> {
  try {
    // Lazy: config.js needs the service env, and the pure helpers above are tested without it.
    const { supabase } = await import('../config.js');
    const [{ data }, { data: template }] = await Promise.all([
      supabase.from('studios').select('settings').eq('id', studioId).maybeSingle(),
      supabase.from('pass_templates').select('static_texts').eq('studio_id', studioId).eq('is_active', true).maybeSingle(),
    ]);
    return qrHintToggleOn(template?.static_texts ?? null) && friendGiftOnFromSettings(data?.settings ?? null);
  } catch (err) {
    console.error('[qr-hint] studio read failed', { studioId, err });
    return false;
  }
}

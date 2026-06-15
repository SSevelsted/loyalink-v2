import { appUrl } from '../config.js';

export type PassLifecycleType = 'card_issued' | 'card_installed' | 'card_uninstalled';

// Fire-and-forget: notify the Next.js app to dispatch a card lifecycle webhook
// (card.issued / card.installed / card.uninstalled). Authenticated with the
// shared internal secret, mirroring the /api/emails/pass-lifecycle call.
export function firePassLifecycle(
  type: PassLifecycleType,
  payload: { customerId: string; studioId: string; serialNumber: string; platform: 'apple' | 'google' },
) {
  const secret = process.env.PASS_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  fetch(`${appUrl}/api/internal/pass-lifecycle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-loyalink-internal-secret': secret || '',
    },
    body: JSON.stringify({ type, ...payload }),
  }).catch((err: unknown) => console.error(`[${type}] Failed to dispatch lifecycle webhook:`, err));
}

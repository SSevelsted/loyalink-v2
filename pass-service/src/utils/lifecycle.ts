import { appUrl } from '../config.js';

export type PassLifecycleType = 'card_issued' | 'card_installed' | 'card_uninstalled';

// Notify the Next.js app to dispatch a card lifecycle webhook
// (card.issued / card.installed / card.uninstalled). Authenticated with the
// shared internal secret, mirroring the /api/emails/pass-lifecycle call.
// Await the returned promise before responding — the internal route defers
// the actual webhook delivery, so this only costs one quick roundtrip, and
// an unawaited call can be lost if the process restarts mid-flight.
// Errors are logged, never thrown.
export function firePassLifecycle(
  type: PassLifecycleType,
  payload: { customerId: string; studioId: string; serialNumber: string; platform: 'apple' | 'google' },
): Promise<void> {
  const secret = process.env.PASS_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${appUrl}/api/internal/pass-lifecycle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-loyalink-internal-secret': secret || '',
    },
    body: JSON.stringify({ type, ...payload }),
  })
    .then((res) => {
      if (!res.ok) console.error(`[${type}] Lifecycle webhook dispatch returned ${res.status}`);
    })
    .catch((err: unknown) => console.error(`[${type}] Failed to dispatch lifecycle webhook:`, err));
}

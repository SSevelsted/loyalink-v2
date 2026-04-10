import { createHmac } from 'crypto'
import { adminSupabase } from '@/lib/studio-access'

export type WebhookEvent =
  | 'member.created'
  | 'transaction.created'
  | 'balance.updated'
  | 'tier.upgraded'
  | 'referral.activated'
  | 'promotion.expired'

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'member.created', label: 'Member Created' },
  { value: 'transaction.created', label: 'Transaction Created' },
  { value: 'balance.updated', label: 'Balance Updated' },
  { value: 'tier.upgraded', label: 'Tier Upgraded' },
  { value: 'referral.activated', label: 'Referral Activated' },
  { value: 'promotion.expired', label: 'Promotion Expired' },
]

type WebhookPayload = {
  event: WebhookEvent
  studio_id: string
  customer_id: string
  data: Record<string, unknown>
  timestamp: string
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Fire webhooks for a studio event. Non-blocking — errors are logged, never thrown.
 */
export function fireWebhook(
  studioId: string,
  event: WebhookEvent,
  customerId: string,
  data: Record<string, unknown>,
) {
  void deliverWebhooks(studioId, event, customerId, data).catch((err) => {
    console.error('[webhook] top-level delivery error:', err)
  })
}

async function deliverWebhooks(
  studioId: string,
  event: WebhookEvent,
  customerId: string,
  data: Record<string, unknown>,
) {
  const { data: webhooks } = await adminSupabase
    .from('studio_webhooks')
    .select('id, url, secret, events')
    .eq('studio_id', studioId)
    .eq('active', true)

  if (!webhooks?.length) return

  const matching = webhooks.filter(
    (w) => (w.events as string[]).length === 0 || (w.events as string[]).includes(event),
  )

  if (!matching.length) return

  const payload: WebhookPayload = {
    event,
    studio_id: studioId,
    customer_id: customerId,
    data,
    timestamp: new Date().toISOString(),
  }
  const body = JSON.stringify(payload)

  await Promise.allSettled(
    matching.map((webhook) => deliverToEndpoint(webhook.id, webhook.url, webhook.secret, body)),
  )
}

async function deliverToEndpoint(
  webhookId: string,
  url: string,
  secret: string,
  body: string,
  attempt = 1,
) {
  const signature = signPayload(body, secret)
  let statusCode: number | null = null
  let responseBody: string | null = null
  let success = false

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Loyalink-Signature': signature,
        'X-Loyalink-Event': JSON.parse(body).event,
      },
      signal: AbortSignal.timeout(10_000),
    })

    statusCode = res.status
    responseBody = await res.text().catch(() => null)
    success = res.ok
  } catch (err) {
    responseBody = err instanceof Error ? err.message : 'Unknown error'
  }

  // Log delivery
  try {
    await adminSupabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event: JSON.parse(body).event,
      payload: JSON.parse(body),
      status_code: statusCode,
      response_body: responseBody?.slice(0, 2000) ?? null,
      success,
      attempt,
    })
  } catch { /* non-critical */ }

  // Retry once on failure after 3s
  if (!success && attempt < 2) {
    await new Promise((r) => setTimeout(r, 3000))
    return deliverToEndpoint(webhookId, url, secret, body, attempt + 1)
  }
}

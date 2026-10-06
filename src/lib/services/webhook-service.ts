import { lookup } from 'dns/promises'
import { adminSupabase } from '@/lib/studio-access'
import type { WebhookEvent } from '@/lib/webhook-events'

export type { WebhookEvent }

type WebhookPayload = {
  event: WebhookEvent
  studio_id: string
  customer_id: string
  data: Record<string, unknown>
  timestamp: string
}

function isPrivateIP(ip: string): boolean {
  // IPv4 checks
  const parts = ip.split('.').map(Number)
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    if (ip === '0.0.0.0') return true
    if (parts[0] === 127) return true                          // 127.0.0.0/8
    if (parts[0] === 10) return true                           // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true      // 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true      // 169.254.0.0/16
    return false
  }

  // IPv6 checks
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true  // fc00::/7
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb')) return true // fe80::/10
  return false
}

async function isPrivateUrl(url: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return true // Malformed URLs are blocked
  }

  if (parsed.protocol !== 'https:') return true

  const hostname = parsed.hostname
  if (hostname === 'localhost' || hostname === '[::1]') return true

  try {
    // Resolve to catch DNS rebinding to private IPs
    const { address } = await lookup(hostname)
    return isPrivateIP(address)
  } catch {
    return true // Unresolvable hostnames are blocked
  }
}

/**
 * Fire webhooks for a studio event. Errors are logged, never thrown.
 *
 * Deliveries are unsigned: the receiver just trusts POSTs to the URL it configured.
 * The only protection retained is SSRF blocking of private/internal endpoints.
 */
export function fireWebhook(
  studioId: string,
  event: WebhookEvent,
  customerId: string,
  data: Record<string, unknown>,
): Promise<void> {
  return deliverWebhooks(studioId, event, customerId, data).then(() => undefined, (err) => {
    console.error('[webhook] top-level delivery error:', {
      studioId,
      event,
      customerId,
      error: err instanceof Error ? err.message : err,
    })
  })
}

/** Does a webhook with this events list receive the event? An empty list means every event. */
export function webhookListensTo(events: unknown, event: WebhookEvent): boolean {
  const list = Array.isArray(events) ? events : []
  return list.length === 0 || list.includes(event)
}

async function activeWebhooksFor(studioId: string, event: WebhookEvent) {
  const { data: webhooks } = await adminSupabase
    .from('studio_webhooks')
    .select('id, url, events')
    .eq('studio_id', studioId)
    .eq('active', true)
  return (webhooks ?? []).filter((w) => webhookListensTo(w.events, event))
}

/** Does the studio have an active webhook that receives this event? One read. */
export async function studioHasWebhookFor(studioId: string, event: WebhookEvent): Promise<boolean> {
  return (await activeWebhooksFor(studioId, event)).length > 0
}

/**
 * Deliver now and wait (retry included). For a request that must know the
 * receiver got it. matched = webhooks for the event, delivered = 2xx answers.
 */
export async function deliverWebhookNow(
  studioId: string,
  event: WebhookEvent,
  customerId: string,
  data: Record<string, unknown>,
): Promise<{ matched: number; delivered: number }> {
  try {
    return await deliverWebhooks(studioId, event, customerId, data)
  } catch (err) {
    console.error('[webhook] delivery error:', { studioId, event, customerId, error: err instanceof Error ? err.message : err })
    return { matched: 0, delivered: 0 }
  }
}

async function deliverWebhooks(
  studioId: string,
  event: WebhookEvent,
  customerId: string,
  data: Record<string, unknown>,
): Promise<{ matched: number; delivered: number }> {
  const matching = await activeWebhooksFor(studioId, event)
  if (!matching.length) return { matched: 0, delivered: 0 }

  const payload: WebhookPayload = {
    event,
    studio_id: studioId,
    customer_id: customerId,
    data,
    timestamp: new Date().toISOString(),
  }
  const body = JSON.stringify(payload)

  const results = await Promise.allSettled(
    matching.map((webhook) => deliverToEndpoint(webhook.id, webhook.url, body)),
  )
  return {
    matched: matching.length,
    delivered: results.filter((r) => r.status === 'fulfilled' && r.value).length,
  }
}

async function deliverToEndpoint(
  webhookId: string,
  url: string,
  body: string,
  attempt = 1,
): Promise<boolean> {
  // SSRF protection: block private/internal URLs
  if (await isPrivateUrl(url)) {
    console.warn(`[webhook] blocked delivery to private/internal URL: ${url}`)
    try {
      await adminSupabase.from('webhook_deliveries').insert({
        webhook_id: webhookId,
        event: JSON.parse(body).event,
        payload: JSON.parse(body),
        status_code: null,
        response_body: 'Blocked: URL resolves to a private or internal address',
        success: false,
        attempt,
      })
    } catch { /* non-critical */ }
    return false
  }

  let statusCode: number | null = null
  let responseBody: string | null = null
  let success = false

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Loyalink-Event': JSON.parse(body).event,
      },
      body,
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
    return deliverToEndpoint(webhookId, url, body, attempt + 1)
  }
  return success
}

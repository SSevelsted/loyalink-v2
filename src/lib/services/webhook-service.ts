import { createHmac } from 'crypto'
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

function signPayload(payload: string, secret: string, timestamp: number): string {
  return createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
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

  const timestamp = Math.floor(Date.now() / 1000)

  await Promise.allSettled(
    matching.map((webhook) => deliverToEndpoint(webhook.id, webhook.url, webhook.secret, body, timestamp)),
  )
}

async function deliverToEndpoint(
  webhookId: string,
  url: string,
  secret: string,
  body: string,
  timestamp: number,
  attempt = 1,
) {
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
    return
  }

  const signature = signPayload(body, secret, timestamp)
  let statusCode: number | null = null
  let responseBody: string | null = null
  let success = false

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Loyalink-Webhook-Secret': secret,
        'X-Loyalink-Signature': signature,
        'X-Loyalink-Timestamp': String(timestamp),
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
    return deliverToEndpoint(webhookId, url, secret, body, timestamp, attempt + 1)
  }
}

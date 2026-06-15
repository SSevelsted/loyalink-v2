import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { fireWebhook } from '@/lib/services/webhook-service'
import type { WebhookEvent } from '@/lib/webhook-events'

// Internal sink for wallet card lifecycle webhooks. Called fire-and-forget by the
// pass-service (a separate Express app) when an Apple PassKit device registers or
// unregisters a pass. Authenticated with the shared PASS_SERVICE_SECRET, the same
// internal-secret scheme used by /api/emails/pass-lifecycle.
//
// Apple-only: Google Wallet gives no server-side "saved"/"removed" callback, so the
// pass-service never calls this for Google passes.

function verifyInternalSecret(headerValue: string | null): boolean {
  const expected = process.env.PASS_SERVICE_SECRET
  if (!expected || !headerValue) return false

  const a = Buffer.from(headerValue)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}

const EVENT_FOR_TYPE: Record<string, WebhookEvent> = {
  card_installed: 'card.installed',
  card_uninstalled: 'card.uninstalled',
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-loyalink-internal-secret')
    if (!verifyInternalSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, customerId, studioId, platform, serialNumber } = await request.json()

    const event = EVENT_FOR_TYPE[type as string]
    if (!event) {
      return NextResponse.json({ error: 'Unknown lifecycle type' }, { status: 400 })
    }
    if (!customerId || !studioId) {
      return NextResponse.json({ error: 'customerId and studioId are required' }, { status: 400 })
    }

    // Enrich with the public member id so consumers can match against the loyalty
    // ID they offered the card under (the same id encoded in the card QR).
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('member_id')
      .eq('id', customerId)
      .single()

    fireWebhook(studioId, event, customerId, {
      platform: platform ?? 'apple',
      serial_number: serialNumber ?? null,
      member_id: customer?.member_id ?? null,
    })

    return NextResponse.json({ success: true, event })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

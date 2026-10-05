import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiError, apiSuccess } from '@/lib/api-response'
import { passServiceFetch } from '@/lib/pass-service'
import {
  parseWalletMessageBody,
  renderFriendGift,
  WALLET_MESSAGE_COOLDOWN_HOURS,
} from '@/lib/wallet-messages'

type Params = { params: Promise<{ id: string }> }

const MESSAGE_TYPE = 'wallet_message'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type PushResult = {
  apple?: { sent?: number; failed?: number }
  google?: { notified?: number; failed?: number }
}

/**
 * POST /api/v1/members/{id}/wallet-message  { body, header?, message_id? }
 * Send one wallet-pass notification to one member, on Apple and Google.
 * {first_name} renders per member; {friend_gift} renders from the studio's
 * referral settings (400 when no amount is set).
 * 200 with zero counts and has_pass false when the member has no pass.
 * 429 when this member got a message through this endpoint in the last 20 h.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)
    const studioId = auth.studioId

    const parsed = parseWalletMessageBody(await request.json().catch(() => null))
    if (!parsed.ok) return apiError(parsed.error, 400)
    const { header, message_id: messageId } = parsed.value

    if (!UUID_RE.test(id)) return apiError('Member not found', 404)
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('studio_id', studioId)
      .maybeSingle()
    if (!customer) return apiError('Member not found', 404)

    const { data: studio } = await adminSupabase.from('studios').select('settings').eq('id', studioId).single()
    const rendered = renderFriendGift(parsed.value.body, (studio?.settings ?? null) as Record<string, unknown> | null)
    if (!rendered.ok) return apiError(rendered.error, 400)

    const { count: passCount } = await adminSupabase
      .from('wallet_passes')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', id)
    if (!passCount) {
      return apiSuccess({ apple: { sent: 0, failed: 0 }, google: { notified: 0, failed: 0 }, has_pass: false })
    }

    // Rate guard: one message per member per 20 h through this endpoint. A
    // 'sending' row counts too, so two parallel calls cannot both go out.
    const since = new Date(Date.now() - WALLET_MESSAGE_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
    const { data: recent } = await adminSupabase
      .from('wallet_push_logs')
      .select('created_at')
      .eq('studio_id', studioId)
      .eq('customer_id', id)
      .eq('message_type', MESSAGE_TYPE)
      .in('status', ['sending', 'completed'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
    if (recent && recent.length > 0) {
      const retryAt = new Date(new Date(recent[0].created_at).getTime() + WALLET_MESSAGE_COOLDOWN_HOURS * 60 * 60 * 1000)
      const retryAfter = Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000))
      return NextResponse.json(
        { error: `This member already got a wallet message in the last ${WALLET_MESSAGE_COOLDOWN_HOURS} hours`, retry_at: retryAt.toISOString() },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    // wallet_push_logs.target_type allows 'all' | 'customer' | 'tier' (CHECK constraint).
    const { data: log } = await adminSupabase
      .from('wallet_push_logs')
      .insert({
        studio_id: studioId,
        target_type: 'customer',
        customer_id: id,
        message_type: MESSAGE_TYPE,
        status: 'sending',
      })
      .select('id')
      .single()

    let result: PushResult
    try {
      const res = await passServiceFetch(`/api/push/customer/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pushMessage: rendered.text,
          pushHeader: header,
          messageId: messageId ?? `api_${Date.now()}`,
        }),
      })
      if (!res.ok) throw new Error(`pass-service ${res.status}`)
      result = (await res.json()) as PushResult
    } catch (err) {
      console.error(`[wallet-message] ${id}: push failed`, err)
      if (log?.id) await adminSupabase.from('wallet_push_logs').update({ status: 'failed' }).eq('id', log.id)
      return apiError('Wallet service unavailable', 502)
    }

    const apple = { sent: result.apple?.sent ?? 0, failed: result.apple?.failed ?? 0 }
    const google = { notified: result.google?.notified ?? 0, failed: result.google?.failed ?? 0 }
    const delivered = apple.sent + google.notified

    if (log?.id) {
      await adminSupabase
        .from('wallet_push_logs')
        .update({
          // Nothing delivered: mark failed, so the guard does not block a retry.
          status: delivered > 0 ? 'completed' : 'failed',
          total_devices: apple.sent + apple.failed + google.notified + google.failed,
          sent_count: delivered,
          failed_count: apple.failed + google.failed,
        })
        .eq('id', log.id)
    }

    return apiSuccess({ apple, google, has_pass: true })
  } catch {
    return apiError('Internal server error', 500)
  }
}

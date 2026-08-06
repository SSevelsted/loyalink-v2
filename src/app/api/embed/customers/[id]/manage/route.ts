import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { verifyEmbedToken } from '@/lib/embed-access'
import { changeTier, adjustBalance, MemberAdminError } from '@/lib/services/member-admin-service'
import { applyPromotion, revokePromotion, PromotionError } from '@/lib/services/promotion-service'

// ─── POST /api/embed/customers/[id]/manage ────────────────────────────────────
// Manager-only manual edits to a member from the embedded Loyalink Customers
// profile: change tier, set a custom cashback rate (permanently or as a timed
// boost), adjust balance, or revoke an active promotion. Mirrors StreamInk's
// /api/loyalty/members action contract so both surfaces behave identically.
//
// The embed token is otherwise scopeless — the `manage` claim (minted only for
// owners/shop managers) is the sole gate. Everything runs under adminSupabase
// (service role); there is no user session in the embed.

type DurationType = 'unlimited' | 'days' | 'transactions'

async function revokeActive(customerId: string, studioId: string) {
  const { data: active } = await adminSupabase
    .from('member_promotions')
    .select('id')
    .eq('customer_id', customerId)
    .eq('studio_id', studioId)
    .eq('status', 'active')
    .maybeSingle()
  if (active) await revokePromotion(active.id, studioId)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await params
    const body = await request.json().catch(() => ({}))
    const { studioId, token } = body

    if (!studioId || !token) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const payload = verifyEmbedToken(token)
    if (!payload || payload.studioId !== studioId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (payload.manage !== true) {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const durationType: DurationType = body.durationType ?? 'unlimited'
    const durationValue: number = Number(body.durationValue) > 0 ? Math.trunc(Number(body.durationValue)) : 1

    switch (body.action) {
      case 'set_tier': {
        if (body.mode === 'boost') {
          await revokeActive(customerId, studioId)
          await applyPromotion({
            studioId,
            customerId,
            type: 'tier_override',
            tierSlug: body.tierSlug,
            cashbackRate: body.cashbackRate ?? null,
            durationType,
            durationValue,
            appliedBy: 'embed',
          })
        } else {
          await changeTier({
            studioId,
            customerId,
            tierSlug: body.tierSlug,
            cashbackRate: body.cashbackRate ?? null,
            source: 'embed',
          })
        }
        break
      }
      case 'set_cashback': {
        if (body.mode === 'boost') {
          await revokeActive(customerId, studioId)
          await applyPromotion({
            studioId,
            customerId,
            type: 'cashback_boost',
            cashbackRate: body.cashbackRate,
            durationType,
            durationValue,
            appliedBy: 'embed',
          })
        } else {
          // Permanent rate override rides on the member's current tier.
          const { data: customer } = await adminSupabase
            .from('customers')
            .select('loyalty_stage')
            .eq('id', customerId)
            .eq('studio_id', studioId)
            .single()
          if (!customer?.loyalty_stage) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
          }
          await changeTier({
            studioId,
            customerId,
            tierSlug: customer.loyalty_stage,
            cashbackRate: body.cashbackRate,
            source: 'embed',
          })
        }
        break
      }
      case 'adjust_balance': {
        await adjustBalance({
          studioId,
          customerId,
          type: body.type,
          amount: Number(body.amount),
          description: body.description ?? null,
          createdBy: 'embed',
        })
        break
      }
      case 'revoke_promotion': {
        await revokeActive(customerId, studioId)
        break
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MemberAdminError || err instanceof PromotionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

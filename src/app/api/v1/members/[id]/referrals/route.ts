import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    // Verify member belongs to this studio
    const { data: member } = await adminSupabase
      .from('customers')
      .select('id, referral_code, referral_count')
      .eq('id', id)
      .eq('studio_id', auth.studioId)
      .single()

    if (!member) return apiError('Member not found', 404)

    // Get who referred this member
    const { data: referredBy } = await adminSupabase
      .from('referrals')
      .select('id, referrer_customer_id, status, activated_at, created_at')
      .eq('referred_customer_id', id)
      .single()

    let referredByData = null
    if (referredBy) {
      const { data: referrer } = await adminSupabase
        .from('customers')
        .select('id, name, email')
        .eq('id', referredBy.referrer_customer_id)
        .single()

      referredByData = {
        referrer: referrer ? { id: referrer.id, name: referrer.name, email: referrer.email } : null,
        status: referredBy.status,
        activated_at: referredBy.activated_at,
        created_at: referredBy.created_at,
      }
    }

    // Get people this member has referred
    const { data: referrals } = await adminSupabase
      .from('referrals')
      .select('id, referred_customer_id, status, activated_at, commission_expires_at, total_commission_earned, created_at')
      .eq('referrer_customer_id', id)
      .order('created_at', { ascending: false })

    const friendIds = (referrals ?? []).map((r) => r.referred_customer_id)
    let friendsMap: Record<string, { id: string; name: string; email: string | null; has_purchased: boolean }> = {}

    if (friendIds.length > 0) {
      const { data: friends } = await adminSupabase
        .from('customers')
        .select('id, name, email, has_purchased')
        .in('id', friendIds)

      if (friends) {
        friendsMap = Object.fromEntries(friends.map((f) => [f.id, f]))
      }
    }

    const referred = (referrals ?? []).map((r) => {
      const friend = friendsMap[r.referred_customer_id]
      return {
        id: r.id,
        friend: friend
          ? { id: friend.id, name: friend.name, email: friend.email, has_purchased: friend.has_purchased }
          : null,
        status: r.status,
        activated_at: r.activated_at,
        commission_expires_at: r.commission_expires_at,
        total_commission_earned: Number(r.total_commission_earned ?? 0),
        created_at: r.created_at,
      }
    })

    return apiSuccess({
      referral_code: member.referral_code,
      referral_count: member.referral_count ?? 0,
      referred_by: referredByData,
      referred_friends: referred,
    })
  } catch {
    return apiError('Internal server error', 500)
  }
}

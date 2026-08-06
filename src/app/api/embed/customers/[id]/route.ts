import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { verifyEmbedToken } from '@/lib/embed-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = request.nextUrl
  const studioId = searchParams.get('studioId')
  const token = searchParams.get('token')

  if (!studioId || !token) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const payload = verifyEmbedToken(token)
  if (!payload || payload.studioId !== studioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: customer, error } = await adminSupabase
    .from('customers')
    .select(
      'id, name, email, phone, balance, loyalty_stage, cashback_rate, total_real_spend, has_purchased, referral_code, created_at'
    )
    .eq('id', id)
    .eq('studio_id', studioId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Fetch the profile's supporting data in parallel.
  const [txRes, refRes, eventsRes] = await Promise.all([
    adminSupabase
      .from('transactions')
      .select('id, type, amount, description, created_at')
      .eq('studio_id', studioId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    adminSupabase
      .from('referrals')
      .select('id, status, total_commission_earned, created_at, referred_customer:referred_customer_id(name)')
      .eq('studio_id', studioId)
      .eq('referrer_customer_id', id)
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('analytics_events')
      .select('created_at, metadata')
      .eq('studio_id', studioId)
      .eq('customer_id', id)
      .eq('event_type', 'tier_change')
      .order('created_at', { ascending: false }),
  ])

  const tierHistory = (eventsRes.data ?? []).map((e) => {
    const m = (e.metadata ?? {}) as Record<string, unknown>
    return {
      date: e.created_at as string,
      from: (m.from_tier_name as string) ?? (m.from_tier as string) ?? '?',
      to: (m.to_tier_name as string) ?? (m.to_tier as string) ?? '?',
      cashbackRate: m.cashback_rate as number | undefined,
    }
  })

  return NextResponse.json({
    customer,
    transactions: txRes.data ?? [],
    referrals: refRes.data ?? [],
    tierHistory,
    // Manager-level tokens can edit tier / cashback / balance; drives the embed
    // Manage UI. Non-managers get a read-only profile.
    canManage: payload.manage === true,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { verifyEmbedToken } from '@/lib/embed-access'

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  const token = request.nextUrl.searchParams.get('token')

  if (!studioId || !token) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const payload = verifyEmbedToken(token)
  if (!payload || payload.studioId !== studioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { data: transactions },
    { data: customers },
    { data: studio },
    { data: passRows },
    { count: creditCount },
  ] = await Promise.all([
    adminSupabase
      .from('transactions')
      .select('id, customer_id, type, amount')
      .eq('studio_id', studioId)
      .gte('created_at', thirtyDaysAgo),
    adminSupabase
      .from('customers')
      .select('id, balance, loyalty_stage, has_purchased')
      .eq('studio_id', studioId),
    adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single(),
    // Active passes: distinct customers holding an issued/installed wallet pass,
    // matching the full-app overview semantics.
    adminSupabase
      .from('wallet_passes')
      .select('customer_id')
      .eq('studio_id', studioId)
      .in('status', ['active', 'installed']),
    // Total transactions (all-time): count only purchase (credit) rows —
    // auto-generated debit/cashback rows are side-effects of one recorded sale.
    adminSupabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId)
      .eq('type', 'credit'),
  ])

  const txns = transactions ?? []
  const customersList = customers ?? []
  const creditTxns = txns.filter(t => t.type === 'credit')
  const totalRevenue = creditTxns.reduce((sum, t) => sum + Number(t.amount), 0)
  const activeCustomerIds = new Set(txns.map(t => t.customer_id))
  const outstandingBalance = customersList.reduce((sum, c) => sum + Number(c.balance), 0)
  const activePasses = new Set((passRows ?? []).map(p => p.customer_id)).size

  const currency = (studio?.settings as Record<string, unknown>)?.currency as string ?? 'DKK'

  return NextResponse.json({
    kpis: {
      total_revenue: Math.round(totalRevenue),
      active_customers: activeCustomerIds.size,
      total_customers: customersList.length,
      outstanding_balance: Math.round(outstandingBalance * 100) / 100,
      active_passes: activePasses,
      total_transactions: creditCount ?? 0,
    },
    currency,
  })
}

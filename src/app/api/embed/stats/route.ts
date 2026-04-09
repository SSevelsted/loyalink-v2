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
  ])

  const txns = transactions ?? []
  const customersList = customers ?? []
  const creditTxns = txns.filter(t => t.type === 'credit')
  const totalRevenue = creditTxns.reduce((sum, t) => sum + Number(t.amount), 0)
  const activeCustomerIds = new Set(txns.map(t => t.customer_id))
  const outstandingBalance = customersList.reduce((sum, c) => sum + Number(c.balance), 0)

  const currency = (studio?.settings as Record<string, unknown>)?.currency as string ?? 'DKK'

  return NextResponse.json({
    kpis: {
      total_revenue: Math.round(totalRevenue),
      active_customers: activeCustomerIds.size,
      total_customers: customersList.length,
      outstanding_balance: Math.round(outstandingBalance * 100) / 100,
    },
    currency,
  })
}

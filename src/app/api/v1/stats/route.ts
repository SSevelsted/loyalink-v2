import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { searchParams } = request.nextUrl
    const fromDate = searchParams.get('from_date') || new Date(Date.now() - 30 * 86400000).toISOString()
    const toDate = searchParams.get('to_date') || new Date().toISOString()
    const tierFilter = searchParams.get('tier')

    const [
      { data: transactions },
      { data: customers },
      { data: studio },
    ] = await Promise.all([
      adminSupabase
        .from('transactions')
        .select('id, customer_id, type, amount, created_at')
        .eq('studio_id', auth.studioId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate),
      adminSupabase
        .from('customers')
        .select('id, balance, loyalty_stage, has_purchased, total_real_spend, created_at')
        .eq('studio_id', auth.studioId),
      adminSupabase
        .from('studios')
        .select('settings')
        .eq('id', auth.studioId)
        .single(),
    ])

    let customersList = customers ?? []
    let txns = transactions ?? []

    // Tier filtering
    if (tierFilter) {
      customersList = customersList.filter(c => c.loyalty_stage === tierFilter)
      const tierCustomerIds = new Set(customersList.map(c => c.id))
      txns = txns.filter(t => tierCustomerIds.has(t.customer_id))
    }

    const creditTxns = txns.filter(t => t.type === 'credit')
    const totalRevenue = creditTxns.reduce((sum, t) => sum + Number(t.amount), 0)
    const activeCustomerIds = new Set(txns.map(t => t.customer_id))
    const avgTransactionValue = creditTxns.length > 0 ? totalRevenue / creditTxns.length : 0

    // Tier distribution
    const tierCounts = new Map<string, number>()
    for (const c of customersList) {
      const tier = c.loyalty_stage || 'unknown'
      tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1)
    }

    // Outstanding balance
    const outstandingBalance = customersList.reduce((sum, c) => sum + Number(c.balance), 0)

    const currency = (studio?.settings as Record<string, unknown>)?.currency as string ?? 'DKK'

    return apiSuccess({
      period: { from: fromDate, to: toDate },
      kpis: {
        total_revenue: Math.round(totalRevenue),
        active_customers: activeCustomerIds.size,
        total_customers: customersList.length,
        avg_transaction_value: Math.round(avgTransactionValue),
        total_transactions: creditTxns.length,
        outstanding_balance: Math.round(outstandingBalance * 100) / 100,
      },
      tier_distribution: [...tierCounts.entries()].map(([tier, count]) => ({ tier, count })),
      currency,
    })
  } catch {
    return apiError('Internal server error', 500)
  }
}

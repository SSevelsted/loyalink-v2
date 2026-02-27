import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyStudioMember(studioId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { authorized: false as const, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return { authorized: false as const, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { authorized: true as const, userId: user.id }
}

function getGranularity(periodDays: number): 'daily' | 'weekly' | 'monthly' {
  if (periodDays <= 31) return 'daily'
  if (periodDays <= 180) return 'weekly'
  return 'monthly'
}

function bucketDate(date: string, granularity: 'daily' | 'weekly' | 'monthly'): string {
  const d = new Date(date)
  if (granularity === 'daily') return d.toISOString().split('T')[0]
  if (granularity === 'weekly') {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    return monday.toISOString().split('T')[0]
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studioId, dateRange, tierFilter } = body as {
      studioId: string
      dateRange: { from: string; to: string }
      tierFilter?: string | null
    }

    if (!studioId || !dateRange?.from || !dateRange?.to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = await verifyStudioMember(studioId)
    if (!auth.authorized) return auth.error

    const fromDate = new Date(dateRange.from)
    const toDate = new Date(dateRange.to)
    const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    const granularity = getGranularity(periodDays)

    // Previous period for comparison
    const prevFrom = new Date(fromDate)
    prevFrom.setDate(prevFrom.getDate() - periodDays)
    const prevTo = new Date(fromDate)
    prevTo.setDate(prevTo.getDate() - 1)

    // Parallel data fetches
    const [
      { data: currentTxns },
      { data: prevTxns },
      { data: customers },
      { data: passes },
      { data: referrals },
      { data: landingPages },
      { data: studio },
    ] = await Promise.all([
      // 1. Current period transactions
      supabase
        .from('transactions')
        .select('id, customer_id, type, amount, created_at')
        .eq('studio_id', studioId)
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to),
      // 2. Previous period transactions
      supabase
        .from('transactions')
        .select('id, customer_id, type, amount, created_at')
        .eq('studio_id', studioId)
        .gte('created_at', prevFrom.toISOString())
        .lte('created_at', prevTo.toISOString()),
      // 3. All customers (added name for referral leaderboard)
      supabase
        .from('customers')
        .select('id, name, balance, loyalty_stage, has_purchased, total_real_spend, created_at')
        .eq('studio_id', studioId),
      // 4. Active wallet passes
      supabase
        .from('wallet_passes')
        .select('id, serial_number, platform, customer_id, created_at')
        .eq('studio_id', studioId)
        .eq('status', 'active'),
      // 5. Referrals (added referrer/referred ids)
      supabase
        .from('referrals')
        .select('id, referrer_customer_id, referred_customer_id, status, total_commission_earned, created_at')
        .eq('studio_id', studioId),
      // 6. Landing page
      supabase
        .from('studio_landing_pages')
        .select('view_count, signup_count')
        .eq('studio_id', studioId)
        .limit(1),
      // 7. Studio settings
      supabase
        .from('studios')
        .select('settings')
        .eq('id', studioId)
        .single(),
    ])

    let customersList = customers ?? []
    let txns = currentTxns ?? []
    let prevTxnsList = prevTxns ?? []
    const passesList = passes ?? []
    const referralsList = referrals ?? []
    const landing = landingPages?.[0] ?? null

    // ── Tier Filtering ──
    if (tierFilter) {
      customersList = customersList.filter((c) => c.loyalty_stage === tierFilter)
      const tierCustomerIds = new Set(customersList.map((c) => c.id))
      txns = txns.filter((t) => tierCustomerIds.has(t.customer_id))
      prevTxnsList = prevTxnsList.filter((t) => tierCustomerIds.has(t.customer_id))
    }

    // Fetch device registrations for active passes
    const serialNumbers = passesList.map((p) => p.serial_number)
    const { data: deviceRegs } = serialNumbers.length > 0
      ? await supabase
          .from('wallet_device_registrations')
          .select('serial_number')
          .eq('is_active', true)
          .in('serial_number', serialNumbers)
      : { data: [] }
    const installedSerials = new Set((deviceRegs ?? []).map((d) => d.serial_number))

    // ── KPIs ──
    const creditTxns = txns.filter((t) => t.type === 'credit')
    const totalRevenue = creditTxns.reduce((sum, t) => sum + Number(t.amount), 0)

    const prevCreditTxns = prevTxnsList.filter((t) => t.type === 'credit')
    const prevRevenue = prevCreditTxns.reduce((sum, t) => sum + Number(t.amount), 0)
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null

    const activeCustomerIds = new Set(txns.map((t) => t.customer_id))
    const activeCustomers = activeCustomerIds.size

    const prevActiveCustomerIds = new Set(prevTxnsList.map((t) => t.customer_id))
    const prevActiveCustomers = prevActiveCustomerIds.size
    const activeCustomersChange = prevActiveCustomers > 0
      ? ((activeCustomers - prevActiveCustomers) / prevActiveCustomers) * 100
      : null

    const purchasedCustomers = customersList.filter((c) => c.has_purchased)
    const clv = purchasedCustomers.length > 0
      ? purchasedCustomers.reduce((sum, c) => sum + Number(c.total_real_spend), 0) / purchasedCustomers.length
      : 0

    const avgTransactionValue = creditTxns.length > 0 ? totalRevenue / creditTxns.length : 0

    // Avg Deal Size (revenue per unique purchasing customer — ignores deposit splits)
    const uniquePurchasingCustomers = new Set(creditTxns.map((t) => t.customer_id)).size
    const avgDealSize = uniquePurchasingCustomers > 0 ? totalRevenue / uniquePurchasingCustomers : 0

    // Previous period comparisons for all KPIs
    const prevAvgTransaction = prevCreditTxns.length > 0 ? prevRevenue / prevCreditTxns.length : 0
    const avgTransactionChange = prevAvgTransaction > 0
      ? ((avgTransactionValue - prevAvgTransaction) / prevAvgTransaction) * 100
      : null

    const prevUniquePurchasing = new Set(prevCreditTxns.map((t) => t.customer_id)).size
    const prevAvgDealSize = prevUniquePurchasing > 0 ? prevRevenue / prevUniquePurchasing : 0
    const avgDealSizeChange = prevAvgDealSize > 0
      ? ((avgDealSize - prevAvgDealSize) / prevAvgDealSize) * 100
      : null

    // ── Program Health ──
    const passInstallRate = passesList.length > 0
      ? passesList.filter((p) => installedSerials.has(p.serial_number)).length / passesList.length
      : 0

    const retainedCustomers = [...activeCustomerIds].filter((id) => prevActiveCustomerIds.has(id))
    const retentionRate = prevActiveCustomers > 0 ? retainedCustomers.length / prevActiveCustomers : 0

    const customerCreditCounts = new Map<string, number>()
    for (const t of creditTxns) {
      customerCreditCounts.set(t.customer_id, (customerCreditCounts.get(t.customer_id) ?? 0) + 1)
    }
    const customersWithCredits = customerCreditCounts.size
    const customersWithRepeat = [...customerCreditCounts.values()].filter((c) => c >= 2).length
    const repeatPurchaseRate = customersWithCredits > 0 ? customersWithRepeat / customersWithCredits : 0

    // Previous period repeat purchase rate
    const prevCustomerCreditCounts = new Map<string, number>()
    for (const t of prevCreditTxns) {
      prevCustomerCreditCounts.set(t.customer_id, (prevCustomerCreditCounts.get(t.customer_id) ?? 0) + 1)
    }
    const prevCustomersWithCredits = prevCustomerCreditCounts.size
    const prevCustomersWithRepeat = [...prevCustomerCreditCounts.values()].filter((c) => c >= 2).length
    const prevRepeatPurchaseRate = prevCustomersWithCredits > 0 ? prevCustomersWithRepeat / prevCustomersWithCredits : 0
    const repeatPurchaseRateChange = prevRepeatPurchaseRate > 0
      ? ((repeatPurchaseRate - prevRepeatPurchaseRate) / prevRepeatPurchaseRate) * 100
      : null

    const purchaseFrequency = activeCustomers > 0 ? creditTxns.length / activeCustomers : 0

    // ── Value Story Metrics ──

    // Revenue from returning customers (2+ credit txns in the period)
    const returningCustomerIds = [...customerCreditCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([id]) => id)
    const returningCustomerIdSet = new Set(returningCustomerIds)
    const returningRevenue = creditTxns
      .filter((t) => returningCustomerIdSet.has(t.customer_id))
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const returningRevenuePercent = totalRevenue > 0
      ? Math.round((returningRevenue / totalRevenue) * 1000) / 10
      : 0

    // Program ROI: total revenue / loyalty cost (cashback + commissions)
    // Computed after loyalty cost is calculated below, added to response

    // ── Charts ──

    // Revenue over time
    const revenueBuckets = new Map<string, { revenue: number; cashback: number }>()
    for (const t of txns) {
      if (t.type !== 'credit' && t.type !== 'cashback') continue
      const bucket = bucketDate(t.created_at, granularity)
      const existing = revenueBuckets.get(bucket) ?? { revenue: 0, cashback: 0 }
      if (t.type === 'credit') existing.revenue += Number(t.amount)
      else existing.cashback += Number(t.amount)
      revenueBuckets.set(bucket, existing)
    }
    const revenueChart = [...revenueBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, revenue: Math.round(vals.revenue), cashback: Math.round(vals.cashback) }))

    // Customer growth
    const customerBuckets = new Map<string, number>()
    for (const c of customersList) {
      const bucket = bucketDate(c.created_at, granularity)
      customerBuckets.set(bucket, (customerBuckets.get(bucket) ?? 0) + 1)
    }
    let cumulative = 0
    const customerGrowthChart = [...customerBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        cumulative += count
        return { date, new: count, cumulative }
      })

    // Revenue composition: returning vs new customer revenue per bucket
    const revenueCompBuckets = new Map<string, { returning: number; newCust: number }>()
    for (const t of creditTxns) {
      const bucket = bucketDate(t.created_at, granularity)
      const existing = revenueCompBuckets.get(bucket) ?? { returning: 0, newCust: 0 }
      if (returningCustomerIdSet.has(t.customer_id)) {
        existing.returning += Number(t.amount)
      } else {
        existing.newCust += Number(t.amount)
      }
      revenueCompBuckets.set(bucket, existing)
    }
    const revenueComposition = [...revenueCompBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, returning: Math.round(vals.returning), new: Math.round(vals.newCust) }))

    // Deal size trend: avg revenue per unique customer per bucket
    const dealSizeBuckets = new Map<string, { revenue: number; customers: Set<string> }>()
    for (const t of creditTxns) {
      const bucket = bucketDate(t.created_at, granularity)
      const existing = dealSizeBuckets.get(bucket) ?? { revenue: 0, customers: new Set() }
      existing.revenue += Number(t.amount)
      existing.customers.add(t.customer_id)
      dealSizeBuckets.set(bucket, existing)
    }
    const dealSizeTrend = [...dealSizeBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        avgDealSize: vals.customers.size > 0 ? Math.round(vals.revenue / vals.customers.size) : 0,
      }))

    // Tier distribution
    const tierCounts = new Map<string, number>()
    for (const c of customersList) {
      const tier = c.loyalty_stage || 'unknown'
      tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1)
    }
    const tierDistribution = [...tierCounts.entries()].map(([tier, count]) => ({ tier, count }))

    // Transaction breakdown by type
    const txnTypeCounts = new Map<string, { count: number; total: number }>()
    for (const t of txns) {
      const key = t.type ?? 'unknown'
      const existing = txnTypeCounts.get(key) ?? { count: 0, total: 0 }
      txnTypeCounts.set(key, { count: existing.count + 1, total: existing.total + Math.abs(Number(t.amount)) })
    }
    const transactionBreakdown = [...txnTypeCounts.entries()].map(([type, vals]) => ({ type, ...vals }))

    // ── Insights ──

    // Peak day of week
    const dayCounts = new Array(7).fill(0)
    for (const t of creditTxns) {
      dayCounts[new Date(t.created_at).getDay()]++
    }
    const peakDayIndex = dayCounts.indexOf(Math.max(...dayCounts))
    const peakDay = creditTxns.length > 0 ? DAY_NAMES[peakDayIndex] : null

    // Peak hour
    const hourCounts = new Array(24).fill(0)
    for (const t of creditTxns) {
      hourCounts[new Date(t.created_at).getHours()]++
    }
    const peakHour = creditTxns.length > 0 ? hourCounts.indexOf(Math.max(...hourCounts)) : null

    // Time to first purchase
    const firstPurchaseTimes: number[] = []
    const secondPurchaseTimes: number[] = []

    // Group credit txns by customer and sort
    const customerTxns = new Map<string, Date[]>()
    // Need all credit txns for this studio (not just current period) for journey metrics
    const { data: allCreditTxns } = await supabase
      .from('transactions')
      .select('customer_id, amount, created_at')
      .eq('studio_id', studioId)
      .eq('type', 'credit')
      .order('created_at', { ascending: true })

    for (const t of allCreditTxns ?? []) {
      const dates = customerTxns.get(t.customer_id) ?? []
      dates.push(new Date(t.created_at))
      customerTxns.set(t.customer_id, dates)
    }

    const customerMap = new Map(customersList.map((c) => [c.id, c]))
    for (const [custId, dates] of customerTxns) {
      const customer = customerMap.get(custId)
      if (!customer || dates.length === 0) continue
      const createdAt = new Date(customer.created_at)
      const daysToFirst = (dates[0].getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysToFirst >= 0) firstPurchaseTimes.push(daysToFirst)
      if (dates.length >= 2) {
        const daysToSecond = (dates[1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)
        if (daysToSecond >= 0) secondPurchaseTimes.push(daysToSecond)
      }
    }

    // Average time between purchases (median of per-customer avg gaps)
    const avgGaps: number[] = []
    for (const [, dates] of customerTxns) {
      if (dates.length < 2) continue
      let totalGap = 0
      for (let i = 1; i < dates.length; i++) {
        totalGap += (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      }
      avgGaps.push(totalGap / (dates.length - 1))
    }
    const avgTimeBetweenPurchases = avgGaps.length > 0 ? median(avgGaps) : null

    // Outstanding Balance (unfiltered — total studio liability)
    const outstandingBalance = (customers ?? []).reduce((sum, c) => sum + Number(c.balance), 0)

    // Balance Redemption Rate (all-time debits vs all-time rewards)
    const { data: redemptionTxns } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('studio_id', studioId)
      .in('type', ['debit', 'cashback', 'referral_commission'])

    const totalAllTimeDebits = (redemptionTxns ?? [])
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
    const totalAllTimeRewards = (redemptionTxns ?? [])
      .filter(t => t.type === 'cashback' || t.type === 'referral_commission')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const balanceRedemptionRate = totalAllTimeRewards > 0
      ? Math.round((totalAllTimeDebits / totalAllTimeRewards) * 1000) / 10
      : 0

    // Platform split
    const platformCounts = new Map<string, number>()
    for (const p of passesList) {
      platformCounts.set(p.platform, (platformCounts.get(p.platform) ?? 0) + 1)
    }
    const platformSplit = [...platformCounts.entries()].map(([platform, count]) => ({ platform, count }))

    // Landing conversion
    const landingConversion = landing && landing.view_count > 0
      ? landing.signup_count / landing.view_count
      : 0

    // Savings vs discount comparison
    const cashbackTxns = txns.filter((t) => t.type === 'cashback')
    const commissionTxns = txns.filter((t) => t.type === 'referral_commission')
    const totalCashbackPaid = cashbackTxns.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalCommissionsPaid = commissionTxns.reduce((sum, t) => sum + Number(t.amount), 0)
    const loyaltyCost = totalCashbackPaid + totalCommissionsPaid
    const flatDiscountCost = totalRevenue * 0.1

    // ── Referral Metrics ──
    const allCustomerMap = new Map((customers ?? []).map((c) => [c.id, c]))
    const allCreditTxnsList = allCreditTxns ?? []

    // Build set of referred customer ids
    const referredCustomerIds = new Set(referralsList.map((r) => r.referred_customer_id))

    // Revenue from referred customers (current period)
    const referralRevenue = creditTxns
      .filter((t) => referredCustomerIds.has(t.customer_id))
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // New referred customers in current period
    const newCustomersFromReferrals = referralsList.filter((r) => {
      const created = new Date(r.created_at)
      return created >= fromDate && created <= toDate
    }).length

    // Previous period referral comparisons
    const prevReferralRevenue = prevCreditTxns
      .filter((t) => referredCustomerIds.has(t.customer_id))
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const referralRevenueChange = prevReferralRevenue > 0
      ? ((referralRevenue - prevReferralRevenue) / prevReferralRevenue) * 100
      : null

    const prevNewFromReferrals = referralsList.filter((r) => {
      const created = new Date(r.created_at)
      return created >= prevFrom && created <= prevTo
    }).length
    const newFromReferralsChange = prevNewFromReferrals > 0
      ? ((newCustomersFromReferrals - prevNewFromReferrals) / prevNewFromReferrals) * 100
      : null

    // Total revenue from referred customers (all-time)
    const totalRevenueFromReferred = allCreditTxnsList
      .filter((t) => referredCustomerIds.has(t.customer_id))
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Referral activation metrics
    const activatedReferrals = referralsList.filter((r) => r.status === 'activated')
    const referralActivationRate = referralsList.length > 0
      ? activatedReferrals.length / referralsList.length
      : 0
    const totalCommissionPaid = activatedReferrals.reduce((sum, r) => sum + Number(r.total_commission_earned), 0)
    const avgCommission = activatedReferrals.length > 0
      ? totalCommissionPaid / activatedReferrals.length
      : 0

    // Referral conversion rate (% of referred who purchased)
    const referredWhoAlsoPurchased = [...referredCustomerIds].filter((id) => {
      const c = allCustomerMap.get(id)
      return c?.has_purchased
    }).length
    const referralConversionRate = referredCustomerIds.size > 0
      ? referredWhoAlsoPurchased / referredCustomerIds.size
      : 0

    // Referral leaderboard — group by referrer, optionally filter by tier
    const referrerGroups = new Map<string, { count: number; commission: number; referredIds: string[] }>()
    for (const r of referralsList) {
      const existing = referrerGroups.get(r.referrer_customer_id) ?? { count: 0, commission: 0, referredIds: [] }
      existing.count++
      existing.commission += Number(r.total_commission_earned)
      existing.referredIds.push(r.referred_customer_id)
      referrerGroups.set(r.referrer_customer_id, existing)
    }

    // Build credit txn amounts by customer for revenue calculation
    const creditByCustomer = new Map<string, number>()
    for (const t of allCreditTxnsList) {
      creditByCustomer.set(t.customer_id, (creditByCustomer.get(t.customer_id) ?? 0) + Number(t.amount))
    }

    let leaderboardEntries = [...referrerGroups.entries()].map(([customerId, data]) => {
      const customer = allCustomerMap.get(customerId)
      const revenueGenerated = data.referredIds.reduce((sum, id) => sum + (creditByCustomer.get(id) ?? 0), 0)
      return {
        customerId,
        name: customer?.name ?? 'Unknown',
        loyaltyStage: customer?.loyalty_stage ?? '',
        referralCount: data.count,
        totalCommission: Math.round(data.commission),
        revenueGenerated: Math.round(revenueGenerated),
      }
    })

    // Filter leaderboard by tier if tierFilter is set
    if (tierFilter) {
      leaderboardEntries = leaderboardEntries.filter((e) => e.loyaltyStage === tierFilter)
    }

    const leaderboard = leaderboardEntries
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, 5)
      .map((entry, i) => ({
        rank: i + 1,
        name: entry.name,
        customerId: entry.customerId,
        referralCount: entry.referralCount,
        totalCommission: entry.totalCommission,
        revenueGenerated: entry.revenueGenerated,
      }))

    // Referral growth chart
    const referralBuckets = new Map<string, { referrals: number; activated: number }>()
    for (const r of referralsList) {
      const bucket = bucketDate(r.created_at, granularity)
      const existing = referralBuckets.get(bucket) ?? { referrals: 0, activated: 0 }
      existing.referrals++
      if (r.status === 'activated') existing.activated++
      referralBuckets.set(bucket, existing)
    }
    const referralGrowthChart = [...referralBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, referrals: vals.referrals, activated: vals.activated }))

    return NextResponse.json({
      granularity,
      periodDays,
      kpis: {
        totalRevenue: Math.round(totalRevenue),
        revenueChange: revenueChange !== null ? Math.round(revenueChange * 10) / 10 : null,
        activeCustomers,
        activeCustomersChange: activeCustomersChange !== null ? Math.round(activeCustomersChange * 10) / 10 : null,
        avgDealSize: Math.round(avgDealSize),
        avgDealSizeChange: avgDealSizeChange !== null ? Math.round(avgDealSizeChange * 10) / 10 : null,
        clv: Math.round(clv),
        avgTransactionValue: Math.round(avgTransactionValue),
        avgTransactionChange: avgTransactionChange !== null ? Math.round(avgTransactionChange * 10) / 10 : null,
        referralRevenue: Math.round(referralRevenue),
        referralRevenueChange: referralRevenueChange !== null ? Math.round(referralRevenueChange * 10) / 10 : null,
        newCustomersFromReferrals,
        newFromReferralsChange: newFromReferralsChange !== null ? Math.round(newFromReferralsChange * 10) / 10 : null,
        repeatPurchaseRateChange: repeatPurchaseRateChange !== null ? Math.round(repeatPurchaseRateChange * 10) / 10 : null,
      },
      programHealth: {
        passInstallRate: Math.round(passInstallRate * 1000) / 10,
        passesInstalled: passesList.filter((p) => installedSerials.has(p.serial_number)).length,
        passesTotal: passesList.length,
        retentionRate: Math.round(retentionRate * 1000) / 10,
        retainedCount: retainedCustomers.length,
        prevActiveCount: prevActiveCustomers,
        repeatPurchaseRate: Math.round(repeatPurchaseRate * 1000) / 10,
        repeatCount: customersWithRepeat,
        purchasersCount: customersWithCredits,
        purchaseFrequency: Math.round(purchaseFrequency * 10) / 10,
      },
      charts: {
        revenue: revenueChart,
        customerGrowth: customerGrowthChart,
        revenueComposition,
        dealSizeTrend,
        tierDistribution,
        transactionBreakdown,
      },
      insights: {
        peakDay,
        peakHour,
        timeToFirstPurchase: median(firstPurchaseTimes),
        timeToSecondPurchase: median(secondPurchaseTimes),
        referralActivationRate: Math.round(referralActivationRate * 1000) / 10,
        avgReferralCommission: Math.round(avgCommission),
        totalReferrals: referralsList.length,
        activatedReferrals: activatedReferrals.length,
        platformSplit,
        landingConversion: Math.round(landingConversion * 1000) / 10,
        landingViews: landing?.view_count ?? 0,
        landingSignups: landing?.signup_count ?? 0,
        loyaltyCost: Math.round(loyaltyCost),
        flatDiscountCost: Math.round(flatDiscountCost),
        avgTimeBetweenPurchases: avgTimeBetweenPurchases !== null
          ? Math.round(avgTimeBetweenPurchases * 10) / 10
          : null,
      },
      referrals: {
        totalReferrals: referralsList.length,
        activatedReferrals: activatedReferrals.length,
        activationRate: Math.round(referralActivationRate * 1000) / 10,
        totalRevenueFromReferred: Math.round(totalRevenueFromReferred),
        avgCommission: Math.round(avgCommission),
        totalCommissionPaid: Math.round(totalCommissionPaid),
        referralConversionRate: Math.round(referralConversionRate * 1000) / 10,
        leaderboard,
        growthChart: referralGrowthChart,
      },
      valueStory: {
        programRoi: loyaltyCost > 0 ? Math.round((totalRevenue / loyaltyCost) * 10) / 10 : null,
        loyaltyCost: Math.round(loyaltyCost),
        returningRevenuePercent,
        returningRevenue: Math.round(returningRevenue),
        referralPayback: totalCommissionPaid > 0
          ? Math.round((totalRevenueFromReferred / totalCommissionPaid) * 10) / 10
          : null,
        totalCommissionPaid: Math.round(totalCommissionPaid),
        totalRevenueFromReferred: Math.round(totalRevenueFromReferred),
      },
      totals: {
        customers: customersList.length,
        passes: passesList.length,
      },
      balances: {
        outstandingBalance: Math.round(outstandingBalance * 100) / 100,
        redemptionRate: balanceRedemptionRate,
        totalRedeemed: Math.round(totalAllTimeDebits),
        totalEarned: Math.round(totalAllTimeRewards),
      },
      currency: (studio?.settings as Record<string, unknown>)?.currency as string ?? 'kr',
    })
  } catch (err) {
    console.error('Analytics dashboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

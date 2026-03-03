'use client'

import { useQuery } from '@tanstack/react-query'
import { useStudio } from './use-studio'

export type DatePreset = '7d' | '30d' | '90d' | '12m' | 'all' | 'custom'

function getDateRange(preset: DatePreset, customRange?: { from: string; to: string }): { from: string; to: string } {
  if (preset === 'custom' && customRange) {
    return customRange
  }

  const to = new Date()
  to.setHours(23, 59, 59, 999)

  if (preset === 'all' || preset === 'custom') {
    return { from: '2020-01-01T00:00:00.000Z', to: to.toISOString() }
  }

  const from = new Date()
  switch (preset) {
    case '7d':
      from.setDate(from.getDate() - 7)
      break
    case '30d':
      from.setDate(from.getDate() - 30)
      break
    case '90d':
      from.setDate(from.getDate() - 90)
      break
    case '12m':
      from.setFullYear(from.getFullYear() - 1)
      break
  }
  from.setHours(0, 0, 0, 0)

  return { from: from.toISOString(), to: to.toISOString() }
}

export type AnalyticsDashboard = {
  granularity: 'daily' | 'weekly' | 'monthly'
  periodDays: number
  kpis: {
    totalRevenue: number
    revenueChange: number | null
    activeCustomers: number
    activeCustomersChange: number | null
    avgDealSize: number
    avgDealSizeChange: number | null
    clv: number
    avgTransactionValue: number
    avgTransactionChange: number | null
    referralRevenue: number
    referralRevenueChange: number | null
    newCustomersFromReferrals: number
    newFromReferralsChange: number | null
    repeatPurchaseRateChange: number | null
  }
  programHealth: {
    passInstallRate: number
    passesInstalled: number
    passesTotal: number
    passUninstallRate: number
    passesUninstalled: number
    passesEverInstalled: number
    retentionRate: number
    retainedCount: number
    prevActiveCount: number
    repeatPurchaseRate: number
    repeatCount: number
    purchasersCount: number
    purchaseFrequency: number
  }
  charts: {
    revenue: Array<{ date: string; revenue: number; cashback: number }>
    customerGrowth: Array<{ date: string; new: number; cumulative: number }>
    revenueComposition: Array<{ date: string; returning: number; new: number }>
    dealSizeTrend: Array<{ date: string; avgDealSize: number }>
    tierDistribution: Array<{ tier: string; count: number }>
    transactionBreakdown: Array<{ type: string; count: number; total: number }>
  }
  insights: {
    peakDay: string | null
    peakHour: number | null
    timeToFirstPurchase: number | null
    timeToSecondPurchase: number | null
    referralActivationRate: number
    avgReferralCommission: number
    totalReferrals: number
    activatedReferrals: number
    platformSplit: Array<{ platform: string; count: number }>
    landingConversion: number
    landingViews: number
    landingSignups: number
    loyaltyCost: number
    flatDiscountCost: number
    avgTimeBetweenPurchases: number | null
  }
  referrals: {
    totalReferrals: number
    activatedReferrals: number
    activationRate: number
    totalRevenueFromReferred: number
    avgCommission: number
    totalCommissionPaid: number
    referralConversionRate: number
    leaderboard: Array<{
      rank: number
      name: string
      customerId: string
      referralCount: number
      totalCommission: number
      revenueGenerated: number
    }>
    growthChart: Array<{ date: string; referrals: number; activated: number }>
  }
  valueStory: {
    programRoi: number | null
    loyaltyCost: number
    returningRevenuePercent: number
    returningRevenue: number
    referralPayback: number | null
    totalCommissionPaid: number
    totalRevenueFromReferred: number
  }
  totals: {
    customers: number
    passes: number
  }
  balances: {
    outstandingBalance: number
    redemptionRate: number
    totalRedeemed: number
    totalEarned: number
  }
  currency: string
}

export function useAnalyticsDashboard(
  preset: DatePreset,
  options?: { tierFilter?: string | null; customRange?: { from: string; to: string } }
) {
  const { currentStudio } = useStudio()
  const tierFilter = options?.tierFilter ?? null
  const customRange = options?.customRange

  return useQuery({
    queryKey: ['analytics_dashboard', currentStudio?.id, preset, tierFilter, customRange?.from, customRange?.to],
    queryFn: async () => {
      const dateRange = getDateRange(preset, customRange)
      const res = await fetch('/api/analytics/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: currentStudio!.id,
          dateRange,
          tierFilter: tierFilter || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json() as Promise<AnalyticsDashboard>
    },
    enabled: !!currentStudio,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

'use client'

import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useStudio } from '@/hooks/use-studio'
import { useAnalyticsDashboard, type DatePreset } from '@/hooks/use-analytics'
import { useRewardsConfig } from '@/hooks/use-rewards'
import { DateRangeFilter } from './_components/date-range-filter'
import { TierFilter } from './_components/tier-filter'
import { KpiCards, KpiCardsSkeleton } from './_components/kpi-cards'
import { InsightsCards } from './_components/insights-cards'
import { ProgramHealthCards, ProgramHealthSkeleton } from './_components/program-health-cards'
import { LandingPageSection } from './_components/landing-page-section'
import { ReferralSection } from './_components/referral-section'
import { RevenueChart } from './_components/revenue-chart'
import { CustomerGrowthChart } from './_components/customer-growth-chart'
import { RevenueCompositionChart } from './_components/revenue-composition-chart'
import { DealSizeTrendChart } from './_components/deal-size-trend-chart'
import { TierDistributionChart } from './_components/tier-distribution-chart'
import { ValueStory } from './_components/value-story'

export default function AnalyticsPage() {
  const { currentStudio } = useStudio()
  const [preset, setPreset] = useState<DatePreset>('30d')
  const [tierFilter, setTierFilter] = useState<string | null>(null)
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>()

  const { data, isLoading } = useAnalyticsDashboard(preset, { tierFilter, customRange })
  const { data: rewardsConfig } = useRewardsConfig()

  const showTrend = preset !== 'all'
  const isEmpty = data && data.totals.customers === 0

  return (
    <div className="space-y-8 stagger-children">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Performance and insights for {currentStudio?.name}
            </p>
          </div>
          <DateRangeFilter
            value={preset}
            onChange={setPreset}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>
        {rewardsConfig && rewardsConfig.tiers.length > 1 && (
          <TierFilter value={tierFilter} onChange={setTierFilter} tiers={rewardsConfig.tiers} />
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <>
          <KpiCardsSkeleton />
          <ProgramHealthSkeleton />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-[320px] rounded-2xl animate-shimmer" />
            <div className="h-[320px] rounded-2xl animate-shimmer" />
          </div>
        </>
      )}

      {/* Empty State */}
      {isEmpty && !isLoading && (
        <div className="py-20 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Analytics will appear once customers start joining and transacting
          </p>
        </div>
      )}

      {/* Data */}
      {data && !isEmpty && (
        <>
          {/* Row 1: KPI Cards */}
          <KpiCards data={data} showTrend={showTrend} />

          {/* Row 2: Insights Cards */}
          <InsightsCards data={data} />

          {/* Row 3: Program Health */}
          <ProgramHealthCards data={data} />

          {/* Row 4: Referral Performance */}
          <ReferralSection data={data} />

          {/* Row 5: Landing Page */}
          <LandingPageSection data={data} />

          {/* Row 5: Charts — 2x2 grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            <RevenueChart data={data} />
            <CustomerGrowthChart data={data} />
            <RevenueCompositionChart data={data} />
            <DealSizeTrendChart data={data} />
          </div>

          {/* Row 6: Tier Distribution */}
          <TierDistributionChart data={data} />

          {/* Row 7: Value Story — program ROI summary */}
          <ValueStory data={data} />
        </>
      )}
    </div>
  )
}

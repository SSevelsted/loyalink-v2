'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { useRewardsConfig, useUpdateRewardsConfig, useMigrateTiers } from '@/hooks/use-rewards'
import { useTierMemberCounts } from '@/hooks/use-tier-member-counts'
import type { RewardsConfig } from '@/types/database'
import { DEFAULT_REWARDS_CONFIG } from '@/types/database'
import { computeTierDiff, type TierDiff } from '@/lib/tier-diff'
import { TierMigrationDialog, type TierMigration } from '@/components/rewards/tier-migration-dialog'
import { toast } from 'sonner'
import { User, Building2, Users, Gift, Share2, FileText, CreditCard, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

import { AccountSection } from './_components/account-section'
import { StudioSection } from './_components/studio-section'
import { TeamSection } from './_components/team-section'
import { RewardsSection } from './_components/rewards-section'
import { ReferralsSection } from './_components/referrals-section'
import { LandingPageSection } from './_components/landing-page-section'
import { BillingSection } from './_components/billing-section'
import { ApiSection } from './_components/api-section'

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'studio', label: 'Studio', icon: Building2 },
  { id: 'landing-page', label: 'Landing Page', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'referrals', label: 'Referrals', icon: Share2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'api', label: 'API', icon: Key },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function SettingsPage() {
  const { currentStudio, membership } = useStudio()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const [activeSection, setActiveSection] = useState<SectionId>('account')

  // Rewards config (shared between Rewards + Referrals)
  const { data: rewardsConfig } = useRewardsConfig()
  const updateRewardsConfig = useUpdateRewardsConfig()
  const migrateTiers = useMigrateTiers()
  const [localRewardsConfig, setLocalRewardsConfig] = useState<RewardsConfig>(DEFAULT_REWARDS_CONFIG)

  // Migration dialog state
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false)
  const [pendingDiff, setPendingDiff] = useState<TierDiff | null>(null)

  // Slugs that need member counts (for the migration preview)
  const affectedSlugs = pendingDiff
    ? [
        ...pendingDiff.removedTiers.map((t) => t.slug),
        ...pendingDiff.rateChangedTiers.map((t) => t.slug),
      ]
    : []
  const { data: migrationPreview } = useTierMemberCounts(affectedSlugs)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (rewardsConfig) setLocalRewardsConfig(rewardsConfig)
  }, [rewardsConfig])

  const handleSaveRewards = useCallback(async () => {
    if (!rewardsConfig) return

    const diff = computeTierDiff(rewardsConfig, localRewardsConfig)

    if (diff.requiresMigration) {
      setPendingDiff(diff)
      setMigrationDialogOpen(true)
      return
    }

    try {
      await updateRewardsConfig.mutateAsync(localRewardsConfig)
      toast.success('Rewards config saved')
    } catch {
      toast.error('Failed to save rewards config')
    }
  }, [rewardsConfig, localRewardsConfig, updateRewardsConfig])

  const handleMigrationConfirm = useCallback(async (migration: TierMigration) => {
    try {
      const result = await migrateTiers.mutateAsync({
        newConfig: localRewardsConfig,
        mappings: migration.mappings,
        applyRateChanges: migration.applyRateChanges,
        applyToExisting: migration.applyToExisting,
      })

      setMigrationDialogOpen(false)
      setPendingDiff(null)

      if (migration.applyToExisting && result.migratedMembers > 0) {
        toast.success(`Saved! ${result.migratedMembers} members migrated.`)
      } else {
        toast.success('Rewards config saved')
      }
    } catch {
      toast.error('Failed to save rewards config')
    }
  }, [localRewardsConfig, migrateTiers])

  const currency = ((currentStudio?.settings as Record<string, unknown>)?.currency as string) ?? 'dkk'

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>

      {/* Top nav — horizontal scrollable pills */}
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {section.label}
            </button>
          )
        })}
      </nav>

      {/* Content area */}
      <div>
        {activeSection === 'account' && <AccountSection />}
        {activeSection === 'studio' && <StudioSection />}
        {activeSection === 'landing-page' && <LandingPageSection isAdmin={isAdmin} />}
        {activeSection === 'team' && <TeamSection />}
        {activeSection === 'rewards' && (
          <RewardsSection
            config={localRewardsConfig}
            onChange={setLocalRewardsConfig}
            onSave={handleSaveRewards}
            saving={updateRewardsConfig.isPending || migrateTiers.isPending}
            currency={currency}
            isAdmin={isAdmin}
          />
        )}
        {activeSection === 'referrals' && (
          <ReferralsSection
            config={localRewardsConfig}
            onChange={setLocalRewardsConfig}
            onSave={handleSaveRewards}
            saving={updateRewardsConfig.isPending || migrateTiers.isPending}
            currency={currency}
            isAdmin={isAdmin}
          />
        )}
        {activeSection === 'billing' && <BillingSection />}
        {activeSection === 'api' && isAdmin && <ApiSection />}
      </div>

      {pendingDiff && (
        <TierMigrationDialog
          open={migrationDialogOpen}
          onOpenChange={setMigrationDialogOpen}
          diff={pendingDiff}
          newConfig={localRewardsConfig}
          memberCounts={migrationPreview?.members ?? {}}
          promotionCounts={migrationPreview?.promotions ?? {}}
          onConfirm={handleMigrationConfirm}
          loading={migrateTiers.isPending}
        />
      )}
    </div>
  )
}

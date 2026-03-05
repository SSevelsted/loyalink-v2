'use client'

import { useState, useEffect } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { useRewardsConfig, useUpdateRewardsConfig } from '@/hooks/use-rewards'
import type { RewardsConfig } from '@/types/database'
import { DEFAULT_REWARDS_CONFIG } from '@/types/database'
import { toast } from 'sonner'
import { User, Building2, Users, Gift, Share2, FileText, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

import { AccountSection } from './_components/account-section'
import { StudioSection } from './_components/studio-section'
import { TeamSection } from './_components/team-section'
import { RewardsSection } from './_components/rewards-section'
import { ReferralsSection } from './_components/referrals-section'
import { LandingPageSection } from './_components/landing-page-section'
import { BillingSection } from './_components/billing-section'

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'studio', label: 'Studio', icon: Building2 },
  { id: 'landing-page', label: 'Landing Page', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'referrals', label: 'Referrals', icon: Share2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function SettingsPage() {
  const { currentStudio, membership } = useStudio()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const [activeSection, setActiveSection] = useState<SectionId>('account')

  // Rewards config (shared between Rewards + Referrals)
  const { data: rewardsConfig } = useRewardsConfig()
  const updateRewardsConfig = useUpdateRewardsConfig()
  const [localRewardsConfig, setLocalRewardsConfig] = useState<RewardsConfig>(DEFAULT_REWARDS_CONFIG)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (rewardsConfig) setLocalRewardsConfig(rewardsConfig)
  }, [rewardsConfig])

  const handleSaveRewards = async () => {
    try {
      await updateRewardsConfig.mutateAsync(localRewardsConfig)
      toast.success('Rewards config saved')
    } catch {
      toast.error('Failed to save rewards config')
    }
  }

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
            saving={updateRewardsConfig.isPending}
            currency={currency}
            isAdmin={isAdmin}
          />
        )}
        {activeSection === 'referrals' && (
          <ReferralsSection
            config={localRewardsConfig}
            onChange={setLocalRewardsConfig}
            onSave={handleSaveRewards}
            saving={updateRewardsConfig.isPending}
            currency={currency}
            isAdmin={isAdmin}
          />
        )}
        {activeSection === 'billing' && <BillingSection />}
      </div>
    </div>
  )
}

'use client'

import { useStudio } from '@/hooks/use-studio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG } from '@/types/database'
import type { RewardsConfig } from '@/types/database'

export default function EmbedSettings() {
  const { currentStudio } = useStudio()
  const settings = currentStudio?.settings as Record<string, unknown> | undefined

  const config: RewardsConfig = settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : DEFAULT_REWARDS_CONFIG

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Studio Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground">{currentStudio?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Slug</span>
            <span className="text-foreground font-mono">{currentStudio?.slug}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Currency</span>
            <span className="text-foreground">{(settings?.currency as string) ?? 'DKK'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Language</span>
            <span className="text-foreground">{(settings?.language as string) ?? 'en'}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Rewards Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-medium ${config.enabled ? 'text-emerald-400' : 'text-red-400'}`}>
              {config.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          {config.tiers.map((tier, i) => (
            <div key={tier.slug} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {i === 0 ? 'Base Tier' : `Tier ${i + 1}`}: {tier.name}
              </span>
              <span className="text-foreground">{tier.cashback_rate}% cashback</span>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Referrals</span>
            <span className={`font-medium ${config.referrals.enabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              {config.referrals.enabled ? `${config.referrals.referrer_commission_rate}% commission` : 'Disabled'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            To edit rewards configuration, card design, and landing page, visit{' '}
            <a href="https://my.loyalink.ai/settings" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              my.loyalink.ai
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

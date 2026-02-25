'use client'

import { Button } from '@/components/ui/button'
import { ReferralProgram } from '@/components/rewards/referral-program'
import type { RewardsConfig } from '@/types/database'

type ReferralsSectionProps = {
  config: RewardsConfig
  onChange: (config: RewardsConfig) => void
  onSave: () => void
  saving: boolean
  currency: string
  isAdmin: boolean
}

export function ReferralsSection({ config, onChange, onSave, saving, currency, isAdmin }: ReferralsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Referral Program</h2>
        <p className="text-sm text-muted-foreground">Configure how your customers can refer friends and earn rewards.</p>
      </div>

      <ReferralProgram
        config={config}
        onChange={onChange}
        currency={currency}
      />

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} variant="glow">
            {saving ? 'Saving...' : 'Save Referral Config'}
          </Button>
        </div>
      )}
    </div>
  )
}

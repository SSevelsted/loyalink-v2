'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ReferralProgram } from '@/components/rewards/referral-program'
import { PreExistingClientsUpload } from '@/components/settings/pre-existing-clients-upload'
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

      <Separator />

      <div>
        <h3 className="text-base font-semibold">Existing Client List</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Clients on this list won&apos;t count as referrals if they sign up via a referral link.
        </p>
      </div>
      <PreExistingClientsUpload />
    </div>
  )
}

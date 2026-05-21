'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  ChevronDown,
  ChevronUp,
  Gift,
  HelpCircle,
  Users,
} from 'lucide-react'
import type { RewardsConfig } from '@/types/database'
import { REFERRAL_COLOR, getReferralUnlockTier, computeReferralMilestones } from '@/types/database'
import { TriggerSelector } from '@/components/rewards/rewards-config-form'
import { getCurrencyConfig } from '@/lib/currency'

type ReferralProgramProps = {
  config: RewardsConfig
  onChange: (config: RewardsConfig) => void
  currency?: string
}

function NumberInput({
  value,
  onChange,
  suffix,
  min = 0,
  max,
  step = 0.5,
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        onFocus={(e) => e.currentTarget.select()}
        min={min}
        max={max}
        step={step}
        className={`w-24 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className}`}
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

const ALWAYS_ON = '_always'

export function ReferralProgram({
  config,
  onChange,
  currency = 'kr',
}: ReferralProgramProps) {
  const [detailsOpen, setDetailsOpen] = useState(true)
  const currCfg = getCurrencyConfig(currency)
  const commissionEnabled = config.referrals.referrer_commission_rate > 0
  const durationUnlimited = config.referrals.referrer_commission_duration_days === 0

  const updateReferrals = (partial: Partial<RewardsConfig['referrals']>) => {
    onChange({ ...config, referrals: { ...config.referrals, ...partial } })
  }

  const toggleReferrals = (enabled: boolean) => {
    const updated = { ...config, referrals: { ...config.referrals, enabled } }
    // When enabling, auto-set the base tier to unlock referrals if none is set
    if (enabled && !getReferralUnlockTier(updated)) {
      updated.tiers = updated.tiers.map((t, i) => ({
        ...t,
        unlocks_referrals: i === 0,
      }))
    }
    onChange(updated)
  }

  const toggleCommission = (enabled: boolean) => {
    if (enabled) {
      updateReferrals({ referrer_commission_rate: 5 })
    } else {
      updateReferrals({ referrer_commission_rate: 0, referrer_commission_duration_days: 0 })
    }
  }

  const setReferralUnlockTier = (value: string) => {
    if (value === ALWAYS_ON) {
      // Set base (first) tier to unlock referrals
      const tiers = config.tiers.map((t, i) => ({
        ...t,
        unlocks_referrals: i === 0,
      }))
      onChange({ ...config, tiers })
    } else {
      const tiers = config.tiers.map((t) => ({
        ...t,
        unlocks_referrals: t.slug === value,
      }))
      onChange({ ...config, tiers })
    }
  }

  const referralUnlockTier = getReferralUnlockTier(config)
  const milestones = computeReferralMilestones(config)

  // Determine dropdown value: if base tier unlocks, show "Always on"
  const unlockDropdownValue = referralUnlockTier
    ? (config.tiers[0]?.unlocks_referrals ? ALWAYS_ON : referralUnlockTier.slug)
    : ''

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Referral Program</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Let your customers bring in new ones. Completely separate from tier progression.
        </p>
      </div>

      <div className={`rounded-3xl border-2 ${REFERRAL_COLOR.border} ${REFERRAL_COLOR.bg} backdrop-blur-sm p-6 space-y-5`}>
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full ${REFERRAL_COLOR.bg} border ${REFERRAL_COLOR.border} flex items-center justify-center`}>
              <Gift className={`h-6 w-6 ${REFERRAL_COLOR.text}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">Enable Referral Program</p>
              <p className="text-xs text-muted-foreground">Customers earn more cashback for every friend they bring in</p>
            </div>
          </div>
          <Switch
            checked={config.referrals.enabled}
            onCheckedChange={toggleReferrals}
          />
        </div>

        {!config.referrals.enabled && (
          <div className="rounded-xl bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Turn this on to let your loyal customers bring in new ones. They earn more cashback for every friend they refer, and the friend gets a welcome bonus too.
            </p>
          </div>
        )}

        {config.referrals.enabled && (
          <>
            {/* Which tier unlocks referrals */}
            <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-400" />
                <p className="text-xs font-semibold text-violet-400">Who can refer friends?</p>
                <InfoTip text="Choose whether all customers can refer friends from day one, or only those who've reached a specific tier." />
              </div>
              <Select
                value={unlockDropdownValue}
                onValueChange={setReferralUnlockTier}
              >
                <SelectTrigger className="w-[220px] h-8 text-xs">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALWAYS_ON} className="text-xs">
                    Always on (all customers)
                  </SelectItem>
                  {config.tiers.slice(1).map((tier) => (
                    <SelectItem key={tier.slug} value={tier.slug} className="text-xs">
                      After reaching {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Referral bonus summary */}
            {config.referrals.referrer_cashback_bonus_per_ref > 0 && (
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-3 flex items-center justify-between gap-4">
                <p className="text-xs text-violet-400">
                  Each referral adds <span className="font-bold">+{config.referrals.referrer_cashback_bonus_per_ref}%</span> cashback, up to a max of <span className="font-bold">{config.referrals.referrer_cashback_cap}%</span> — on top of whatever tier they&apos;re on.
                </p>
              </div>
            )}

            {/* Referral details — open by default */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/80 transition-colors w-full"
              >
                {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="font-semibold">Referral Details</span>
              </button>

              {detailsOpen && (
                <div className="space-y-5">
                  {/* REFERRER GETS */}
                  <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Your customer (the referrer) gets</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      For every friend they bring in, their cashback rate goes up. They stay on the same tier, but earn more on every purchase.
                    </p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-28 shrink-0 flex items-center gap-1">
                          Cashback boost
                          <InfoTip text="Each friend referred bumps up your customer's cashback rate by this %. Refer 3 friends at 2.5% each = +7.5% extra cashback." />
                        </Label>
                        <NumberInput
                          value={config.referrals.referrer_cashback_bonus_per_ref}
                          onChange={(v) => updateReferrals({ referrer_cashback_bonus_per_ref: v })}
                          suffix="% per friend"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-28 shrink-0 flex items-center gap-1">
                          Cashback cap
                          <InfoTip text="The maximum cashback rate a customer can reach through referrals. Once they hit this, more referrals won't raise it further." />
                        </Label>
                        <NumberInput
                          value={config.referrals.referrer_cashback_cap}
                          onChange={(v) => updateReferrals({ referrer_cashback_cap: v })}
                          suffix="%"
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Commission section */}
                      <div className="border-t border-violet-500/10 pt-2.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            Commission on friend&apos;s purchases
                            <InfoTip text="When enabled, your customer also earns a reward from every purchase their referred friend makes. It's a bonus on top of their own cashback." />
                          </Label>
                          <Switch
                            checked={commissionEnabled}
                            onCheckedChange={toggleCommission}
                          />
                        </div>
                        {commissionEnabled && (
                          <div className="space-y-2.5">
                            {/* Commission type */}
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-28 shrink-0">
                                Type
                              </Label>
                              <Select
                                value={config.referrals.referrer_commission_type ?? 'percentage'}
                                onValueChange={(v: 'percentage' | 'fixed') => {
                                  updateReferrals({
                                    referrer_commission_type: v,
                                    ...(v === 'fixed' ? { referrer_commission_duration_days: 0 } : {}),
                                  })
                                }}
                              >
                                <SelectTrigger className="w-[200px] h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage" className="text-xs">Percentage of purchase</SelectItem>
                                  <SelectItem value="fixed" className="text-xs">Fixed amount per purchase</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Commission value */}
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-28 shrink-0">
                                {(config.referrals.referrer_commission_type ?? 'percentage') === 'percentage' ? 'Rate' : 'Amount'}
                              </Label>
                              <NumberInput
                                value={config.referrals.referrer_commission_rate}
                                onChange={(v) => updateReferrals({ referrer_commission_rate: v })}
                                suffix={(config.referrals.referrer_commission_type ?? 'percentage') === 'percentage' ? "% of friend's spend" : currCfg.symbol}
                                step={(config.referrals.referrer_commission_type ?? 'percentage') === 'percentage' ? 0.5 : 10}
                                className="h-7 text-xs"
                              />
                            </div>

                            {/* Duration: only relevant for percentage commissions (fixed = one-time) */}
                            {(config.referrals.referrer_commission_type ?? 'percentage') === 'percentage' && <>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground w-28 shrink-0 flex items-center gap-1">
                                  Duration
                                  <InfoTip text="How long your customer keeps earning commission from each friend. Unlimited means it never expires." />
                                </Label>
                                <Select
                                  value={durationUnlimited ? 'unlimited' : 'limited'}
                                  onValueChange={(v) => {
                                    if (v === 'unlimited') {
                                      updateReferrals({ referrer_commission_duration_days: 0 })
                                    } else {
                                      updateReferrals({ referrer_commission_duration_days: 90 })
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-[140px] h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unlimited" className="text-xs">Unlimited</SelectItem>
                                    <SelectItem value="limited" className="text-xs">Limited period</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {!durationUnlimited && (
                                <div className="flex items-center gap-2 pl-[7.5rem]">
                                  <NumberInput
                                    value={config.referrals.referrer_commission_duration_days}
                                    onChange={(v) => updateReferrals({ referrer_commission_duration_days: v })}
                                    suffix="days"
                                    step={1}
                                    min={1}
                                    className="h-7 text-xs"
                                  />
                                </div>
                              )}
                            </>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FRIEND GETS */}
                  <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">The referred friend gets</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      When someone joins through your customer&apos;s referral link, they get a head start with a better cashback rate and a welcome bonus.
                    </p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-28 shrink-0 flex items-center gap-1">
                          Starts at tier
                          <InfoTip text="Which tier the referred friend joins at. Usually a higher tier so they feel the benefit right away." />
                        </Label>
                        <Select
                          value={config.referrals.friend_tier_slug}
                          onValueChange={(v) => updateReferrals({ friend_tier_slug: v })}
                        >
                          <SelectTrigger className="w-[160px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {config.tiers.map((tier) => (
                              <SelectItem key={tier.slug} value={tier.slug} className="text-xs">
                                {tier.name} ({tier.cashback_rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-28 shrink-0 flex items-center gap-1">
                          Cashback rate
                          <InfoTip text="The cashback rate referred friends start with. Can be different from the tier's default rate." />
                        </Label>
                        <NumberInput
                          value={config.referrals.friend_cashback_rate}
                          onChange={(v) => updateReferrals({ friend_cashback_rate: v })}
                          suffix="%"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-28 shrink-0 flex items-center gap-1">
                          Welcome bonus
                          <InfoTip text="Free credit added to the friend's account when they join. Set to 0 for no welcome bonus." />
                        </Label>
                        <NumberInput
                          value={config.referrals.friend_welcome_bonus}
                          onChange={(v) => updateReferrals({ friend_welcome_bonus: v })}
                          suffix={currCfg.symbol}
                          step={10}
                          className="h-7 text-xs"
                        />
                        {config.referrals.friend_welcome_bonus === 0 && (
                          <span className="text-xs text-muted-foreground italic">No bonus</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WHEN DOES THE REFERRAL COUNT? */}
                  <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">When does the referral count?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The referrer only gets their bonus after the friend completes this action. Until then, the referral stays pending.
                    </p>
                    <TriggerSelector
                      value={config.referrals.activation_trigger}
                      onChange={(v) => updateReferrals({ activation_trigger: v })}
                      currency={currency}
                      compact
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { Input } from '@/components/ui/input'
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
  ArrowRight,
  CheckCircle2,
  Gift,
  HelpCircle,
  Share2,
  TrendingUp,
  UserPlus,
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

/** Inline number "token" that reads as part of a sentence but is click-to-edit. */
function InlineNumber({
  value,
  onChange,
  min = 0,
  max,
  step = 0.5,
  width = 'w-14',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  width?: string
}) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      onFocus={(e) => e.currentTarget.select()}
      min={min}
      max={max}
      step={step}
      className={`${width} inline-flex h-7 px-1 text-center text-sm font-semibold align-middle rounded-md bg-violet-500/15 border border-violet-500/30 text-foreground focus:border-violet-400 focus-visible:ring-violet-400/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
    />
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors align-middle">
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
const inlineSelectTrigger =
  'inline-flex h-7 w-auto gap-1 px-2 align-middle rounded-md bg-violet-500/15 border border-violet-500/30 text-sm font-semibold text-foreground'

export function ReferralProgram({
  config,
  onChange,
  currency = 'kr',
}: ReferralProgramProps) {
  const currCfg = getCurrencyConfig(currency)
  const r = config.referrals
  const commissionEnabled = r.referrer_commission_rate > 0
  const durationUnlimited = r.referrer_commission_duration_days === 0
  const commissionType = r.referrer_commission_type ?? 'percentage'

  const updateReferrals = (partial: Partial<RewardsConfig['referrals']>) => {
    onChange({ ...config, referrals: { ...config.referrals, ...partial } })
  }

  const toggleReferrals = (enabled: boolean) => {
    const updated = { ...config, referrals: { ...config.referrals, enabled } }
    if (enabled && !getReferralUnlockTier(updated)) {
      updated.tiers = updated.tiers.map((t, i) => ({ ...t, unlocks_referrals: i === 0 }))
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
    const tiers = config.tiers.map((t, i) => ({
      ...t,
      unlocks_referrals: value === ALWAYS_ON ? i === 0 : t.slug === value,
    }))
    onChange({ ...config, tiers })
  }

  const referralUnlockTier = getReferralUnlockTier(config)
  const milestones = computeReferralMilestones(config).filter((m) => m.friends > 0).slice(0, 5)
  const friendTier = config.tiers.find((t) => t.slug === r.friend_tier_slug)

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

      <div className={`rounded-3xl border-2 ${REFERRAL_COLOR.border} ${REFERRAL_COLOR.bg} backdrop-blur-sm p-5 sm:p-6 space-y-5`}>
        {/* Header with toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-12 w-12 rounded-full ${REFERRAL_COLOR.bg} border ${REFERRAL_COLOR.border} flex items-center justify-center shrink-0`}>
              <Gift className={`h-6 w-6 ${REFERRAL_COLOR.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Enable Referral Program</p>
              <p className="text-xs text-muted-foreground">Customers earn more cashback for every friend they bring in</p>
            </div>
          </div>
          <Switch checked={r.enabled} onCheckedChange={toggleReferrals} />
        </div>

        {!r.enabled && (
          <div className="rounded-xl bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Turn this on to let your loyal customers bring in new ones. They earn more cashback for every friend they refer, and the friend gets a welcome bonus too.
            </p>
          </div>
        )}

        {r.enabled && (
          <>
            {/* 1. How it works — the flow at a glance */}
            <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
              {[
                { icon: Share2, title: 'Customer shares', sub: 'their personal link' },
                { icon: UserPlus, title: 'Friend joins', sub: `${r.friend_cashback_rate}% + ${r.friend_welcome_bonus > 0 ? `${r.friend_welcome_bonus} ${currCfg.symbol} bonus` : 'head start'}` },
                { icon: TrendingUp, title: 'Customer earns', sub: `+${r.referrer_cashback_bonus_per_ref}% cashback per friend` },
              ].map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="flex items-center gap-2 sm:flex-1">
                    {i > 0 && <ArrowRight className="h-4 w-4 text-violet-400/40 shrink-0 rotate-90 sm:rotate-0" />}
                    <div className="flex items-center gap-2.5 rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-2.5 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-violet-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">{step.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{step.sub}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 2. Who can refer */}
            <p className="text-sm text-foreground leading-loose">
              Allow referrals from{' '}
              <Select value={unlockDropdownValue} onValueChange={setReferralUnlockTier}>
                <SelectTrigger className={inlineSelectTrigger}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALWAYS_ON} className="text-xs">Day one (all customers)</SelectItem>
                  {config.tiers.slice(1).map((tier) => (
                    <SelectItem key={tier.slug} value={tier.slug} className="text-xs">
                      Once they reach {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              .
            </p>

            {/* 3. The friend gets — sentence-style */}
            <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">The referred friend gets</p>
              <p className="text-sm text-foreground leading-loose">
                New friends join at{' '}
                <Select value={r.friend_tier_slug} onValueChange={(v) => updateReferrals({ friend_tier_slug: v })}>
                  <SelectTrigger className={inlineSelectTrigger}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.tiers.map((tier) => (
                      <SelectItem key={tier.slug} value={tier.slug} className="text-xs">{tier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>{' '}
                earning{' '}
                <InlineNumber value={r.friend_cashback_rate} onChange={(v) => updateReferrals({ friend_cashback_rate: v })} max={100} />{' '}
                % cashback, plus a{' '}
                <InlineNumber value={r.friend_welcome_bonus} onChange={(v) => updateReferrals({ friend_welcome_bonus: v })} step={10} width="w-16" />{' '}
                {currCfg.symbol} welcome bonus to get started.
              </p>
            </div>

            {/* 4. Your customer gets — sentence-style + milestone example */}
            <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Your customer (the referrer) gets</p>
              <p className="text-sm text-foreground leading-loose">
                Each friend they refer adds{' '}
                <InlineNumber value={r.referrer_cashback_bonus_per_ref} onChange={(v) => updateReferrals({ referrer_cashback_bonus_per_ref: v })} />{' '}
                % to their cashback rate, up to{' '}
                <InlineNumber value={r.referrer_cashback_cap} onChange={(v) => updateReferrals({ referrer_cashback_cap: v })} max={100} />{' '}
                % max — on top of their current tier.
              </p>

              {/* Milestone preview: how cashback grows per referral */}
              {milestones.length > 0 && r.referrer_cashback_bonus_per_ref > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {milestones.map((m, i) => {
                    const isCap = m.rate >= r.referrer_cashback_cap
                    return (
                      <span key={m.friends} className="flex items-center gap-1.5">
                        {i > 0 && <ArrowRight className="h-3 w-3 text-violet-400/40" />}
                        <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 border border-violet-500/20 px-2 py-1 text-[11px]">
                          <span className="text-muted-foreground">{m.friends} {m.friends === 1 ? 'friend' : 'friends'}</span>
                          <span className="font-semibold text-violet-300">{m.rate}%{isCap ? ' (max)' : ''}</span>
                        </span>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Commission (advanced) */}
              <div className="border-t border-violet-500/10 pt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    Also earn commission on their friends&apos; purchases
                    <InfoTip text="On top of the cashback boost, your customer earns a reward from every purchase their referred friend makes." />
                  </span>
                  <Switch checked={commissionEnabled} onCheckedChange={toggleCommission} />
                </div>
                {commissionEnabled && (
                  <p className="text-sm text-foreground leading-loose">
                    Earn{' '}
                    <Select
                      value={commissionType}
                      onValueChange={(v: 'percentage' | 'fixed') =>
                        updateReferrals({ referrer_commission_type: v, ...(v === 'fixed' ? { referrer_commission_duration_days: 0 } : {}) })
                      }
                    >
                      <SelectTrigger className={inlineSelectTrigger}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage" className="text-xs">a percentage</SelectItem>
                        <SelectItem value="fixed" className="text-xs">a fixed amount</SelectItem>
                      </SelectContent>
                    </Select>{' '}
                    of{' '}
                    <InlineNumber
                      value={r.referrer_commission_rate}
                      onChange={(v) => updateReferrals({ referrer_commission_rate: v })}
                      step={commissionType === 'percentage' ? 0.5 : 10}
                      width={commissionType === 'percentage' ? 'w-14' : 'w-16'}
                    />{' '}
                    {commissionType === 'percentage' ? '% of each purchase' : `${currCfg.symbol} per purchase`}
                    {commissionType === 'percentage' && (
                      <>
                        ,{' '}
                        <Select
                          value={durationUnlimited ? 'unlimited' : 'limited'}
                          onValueChange={(v) => updateReferrals({ referrer_commission_duration_days: v === 'unlimited' ? 0 : 90 })}
                        >
                          <SelectTrigger className={inlineSelectTrigger}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unlimited" className="text-xs">forever</SelectItem>
                            <SelectItem value="limited" className="text-xs">for a limited time</SelectItem>
                          </SelectContent>
                        </Select>
                        {!durationUnlimited && (
                          <>
                            {' '}of{' '}
                            <InlineNumber
                              value={r.referrer_commission_duration_days}
                              onChange={(v) => updateReferrals({ referrer_commission_duration_days: v })}
                              step={1}
                              min={1}
                            />{' '}
                            days
                          </>
                        )}
                      </>
                    )}
                    .
                  </p>
                )}
              </div>
            </div>

            {/* 5. Activation trigger — the key mechanic, made prominent */}
            <div className="rounded-2xl border-2 border-dashed border-violet-400/40 bg-violet-500/10 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-violet-300" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  A referral only counts once the new friend:
                </span>
              </div>
              <TriggerSelector
                value={r.activation_trigger}
                onChange={(v) => updateReferrals({ activation_trigger: v })}
                currency={currency}
                compact
              />
              <p className="text-[11px] text-muted-foreground">
                Until then the referral stays pending and no bonus is paid — so rewards only go out for real customers.
              </p>
            </div>

            {/* Concrete takeaway */}
            {friendTier && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                In short: refer a friend, they start at{' '}
                <span className="text-foreground font-medium">{r.friend_cashback_rate}%</span>
                {r.friend_welcome_bonus > 0 && (
                  <> with <span className="text-foreground font-medium">{r.friend_welcome_bonus} {currCfg.symbol}</span> free credit</>
                )}
                , and your customer&apos;s own cashback climbs{' '}
                <span className="text-foreground font-medium">+{r.referrer_cashback_bonus_per_ref}%</span> each time.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

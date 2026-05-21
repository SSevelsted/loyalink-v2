'use client'

import { ArrowRight, Gift, Users } from 'lucide-react'
import type { RewardsConfig } from '@/types/database'
import { DEFAULT_TIER_THEMES } from '@/types/database'
import { getTriggerLabel } from '@/components/rewards/rewards-config-form'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type RewardsProgramPreviewProps = {
  config: RewardsConfig
  currency?: string
}

/**
 * Read-only visualization of a rewards program. Shows the tier journey
 * (cashback rate + upgrade trigger) and a one-liner summarising referrals.
 * Used in the simplified setup Step 1 so studios can pick a template without
 * being faced with the full editor.
 */
export function RewardsProgramPreview({ config, currency = 'kr' }: RewardsProgramPreviewProps) {
  const currencyCfg = getCurrencyConfig(currency)
  const referrals = config.referrals

  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/20 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">How your program looks</h3>
      </div>

      {/* Tier journey */}
      <div className="flex items-stretch gap-3 flex-wrap">
        {config.tiers.map((tier, i) => {
          const theme = DEFAULT_TIER_THEMES[tier.slug]
          return (
            <div key={tier.slug} className="flex items-center gap-3">
              {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
              <div
                className="rounded-xl border border-border/30 px-4 py-3 min-w-[120px]"
                style={{
                  backgroundColor: theme?.backgroundColor ?? '#1a1a1a',
                  color: theme?.foregroundColor ?? '#fff',
                }}
              >
                <p className="text-2xl font-bold leading-none">{tier.cashback_rate}%</p>
                <p className="text-xs font-medium opacity-80 mt-1">{tier.name}</p>
                <p
                  className="text-[10px] opacity-70 mt-1.5"
                  style={{ color: theme?.labelColor }}
                >
                  {i === 0
                    ? 'Everyone starts here'
                    : tier.upgrade_trigger
                      ? getTriggerLabel(tier.upgrade_trigger, currency)
                      : 'Upgrade required'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Referral summary */}
      {referrals.enabled && (
        <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-background/40 p-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5 text-xs leading-relaxed">
            <p className="text-foreground">
              <span className="font-semibold">Friends get {referrals.friend_cashback_rate}%</span>
              {referrals.friend_welcome_bonus > 0 && (
                <> {' + '}{formatAmount(referrals.friend_welcome_bonus, currencyCfg)} welcome bonus</>
              )}
              {' '}when they sign up through a referral.
            </p>
            <p className="text-muted-foreground">
              Referrers earn{' '}
              <span className="text-foreground font-medium">
                +{referrals.referrer_cashback_bonus_per_ref}% per referral
              </span>
              , capped at{' '}
              <span className="text-foreground font-medium">{referrals.referrer_cashback_cap}%</span>{' '}
              extra cashback.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

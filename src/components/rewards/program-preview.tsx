'use client'

import { ArrowRight, Gift, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react'
import type { RewardsConfig, UpgradeTriggerConfig } from '@/types/database'
import { DEFAULT_TIER_THEMES } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type RewardsProgramPreviewProps = {
  config: RewardsConfig
  currency?: string
}

/**
 * Plain-language description of how a customer climbs from one tier to the next.
 * Verb-first so studio owners (and their customers) immediately understand the
 * action that triggers an upgrade — this is the thing the preview must make obvious.
 */
function upgradeAction(trigger: UpgradeTriggerConfig | undefined, currency: string): string {
  if (!trigger) return 'Upgrade required'
  const cfg = getCurrencyConfig(currency)
  const n = trigger.threshold ?? 0
  switch (trigger.type) {
    case 'first_purchase':
      return 'Make their first deposit'
    case 'first_full_payment':
      return 'Complete their first full payment'
    case 'total_spend':
      return `Spend ${formatAmount(n, cfg)} in total`
    case 'referral_count':
      return `Refer ${n || 1} ${(n || 1) === 1 ? 'friend' : 'friends'}`
    case 'days_member':
      return `Stay a member for ${n || 30} days`
    default:
      return 'Upgrade required'
  }
}

/**
 * Read-only visualization of a rewards program. Shows the tier journey as a path
 * (horizontal on desktop, vertical on mobile) where the connector between tiers
 * spells out exactly how a customer levels up, a concrete earn example, and a
 * referral one-liner. Used in the simplified setup Step 1 so studios can grasp a
 * template at a glance.
 */
export function RewardsProgramPreview({ config, currency = 'kr' }: RewardsProgramPreviewProps) {
  const currencyCfg = getCurrencyConfig(currency)
  const referrals = config.referrals
  const tiers = config.tiers
  const firstTier = tiers[0]
  const topTier = tiers[tiers.length - 1]
  const hasUpgrades = tiers.length > 1

  // Concrete "what the customer experiences" example, grounded in the base rate.
  const exampleSpend = currencyCfg.exampleAmount
  const exampleCashback = firstTier ? Math.round((exampleSpend * firstTier.cashback_rate) / 100) : 0
  const nextTier = hasUpgrades ? tiers[1] : null
  const nextActionRaw = nextTier ? upgradeAction(nextTier.upgrade_trigger, currency) : ''
  const nextAction = nextActionRaw ? nextActionRaw.charAt(0).toLowerCase() + nextActionRaw.slice(1) : ''

  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/20 p-5 sm:p-6 space-y-5">
      {/* Header + plain-language framing */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">How your program works</h3>
        </div>
        {firstTier && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {hasUpgrades ? (
              <>
                Every customer starts at{' '}
                <span className="text-foreground font-medium">{firstTier.name}</span> earning{' '}
                <span className="text-foreground font-medium">{firstTier.cashback_rate}%</span>{' '}
                cashback, then unlocks higher rates — up to{' '}
                <span className="text-foreground font-medium">{topTier.cashback_rate}%</span> — as
                they hit each milestone below.
              </>
            ) : (
              <>
                Every customer earns{' '}
                <span className="text-foreground font-medium">{firstTier.cashback_rate}%</span>{' '}
                cashback on what they spend.
              </>
            )}
          </p>
        )}
      </div>

      {/* Tier journey: cards connected by explicit "how to level up" steps.
          Horizontal on desktop, vertical stack on mobile. */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-stretch gap-y-3 sm:gap-y-4">
        {tiers.map((tier, i) => {
          const theme = DEFAULT_TIER_THEMES[tier.slug]
          return (
            <div key={tier.slug} className="flex flex-col sm:flex-row sm:items-stretch">
              {i > 0 && (
                <div className="flex items-center gap-2 py-1 sm:flex-col sm:justify-center sm:gap-1 sm:py-0 sm:px-3 sm:min-w-[124px] sm:max-w-[164px]">
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary shrink-0">
                    <TrendingUp className="h-3 w-3" />
                    Level up
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 rotate-90 sm:rotate-0" />
                  <p className="text-xs text-foreground font-medium leading-snug sm:text-center">
                    {upgradeAction(tier.upgrade_trigger, currency)}
                  </p>
                </div>
              )}
              <div
                className="relative w-full sm:w-auto sm:min-w-[132px] rounded-xl border border-border/30 px-4 py-3"
                style={{
                  backgroundColor: theme?.backgroundColor ?? '#1a1a1a',
                  color: theme?.foregroundColor ?? '#fff',
                }}
              >
                {i === 0 && (
                  <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                    Start here
                  </span>
                )}
                <p className="text-xs font-semibold opacity-90">{tier.name}</p>
                <div className="mt-2 flex items-baseline gap-2 sm:block">
                  <p className="text-3xl font-bold leading-none">{tier.cashback_rate}%</p>
                  <p
                    className="text-[10px] font-medium uppercase tracking-wide opacity-60 sm:mt-1"
                    style={{ color: theme?.labelColor }}
                  >
                    cashback
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Concrete earn example — what the customer actually experiences */}
      {firstTier && (
        <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-background/40 p-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="flex-1 min-w-0 text-xs leading-relaxed text-muted-foreground">
            For example, a <span className="text-foreground font-medium">{firstTier.name}</span> who
            spends{' '}
            <span className="text-foreground font-medium">{formatAmount(exampleSpend, currencyCfg)}</span>{' '}
            gets{' '}
            <span className="text-foreground font-medium">
              {formatAmount(exampleCashback, currencyCfg)} back
            </span>{' '}
            as credit to spend on their next visit.
            {nextTier && (
              <>
                {' '}Once they {nextAction}, they&apos;re upgraded to{' '}
                <span className="text-foreground font-medium">{nextTier.name}</span> and start
                earning <span className="text-foreground font-medium">{nextTier.cashback_rate}%</span>.
              </>
            )}
          </p>
        </div>
      )}

      {/* Referral summary */}
      {referrals.enabled && (
        <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-background/40 p-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5 text-xs leading-relaxed">
            <p className="text-foreground font-medium">Plus: customers earn by referring friends</p>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">
                Friends get {referrals.friend_cashback_rate}%
              </span>
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

'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  Award,
  BadgePercent,
  ChevronRight,
  ChevronUp,
  Crown,
  HelpCircle,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { RewardsConfig, TierConfig, UpgradeTriggerConfig } from '@/types/database'
import { DEFAULT_REWARDS_CONFIG, TIER_COLOR_PALETTE, MAX_TIERS } from '@/types/database'
import { TriggerSelector } from '@/components/rewards/rewards-config-form'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import type { RewardTemplate } from '@/lib/rewards-templates'

const TIER_ICONS = [Users, Zap, Crown, Star, Award, Trophy]

type ProgramOverviewProps = {
  config: RewardsConfig
  onChange: (config: RewardsConfig) => void
  currency?: string
  designerHint?: 'next-step' | 'link'
  hideWhyCashbackWorks?: boolean
  baseTemplate?: RewardTemplate
}

function isMatchingTemplate(config: RewardsConfig, template: RewardsConfig): boolean {
  if (config.tiers.length !== template.tiers.length) return false
  for (let i = 0; i < config.tiers.length; i++) {
    if (config.tiers[i].cashback_rate !== template.tiers[i].cashback_rate) return false
  }
  return (
    config.referrals.referrer_cashback_bonus_per_ref === template.referrals.referrer_cashback_bonus_per_ref &&
    config.referrals.referrer_cashback_cap === template.referrals.referrer_cashback_cap
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

export function ProgramOverview({
  config,
  onChange,
  currency = 'kr',
  designerHint = 'next-step',
  hideWhyCashbackWorks = false,
  baseTemplate,
}: ProgramOverviewProps) {
  const referenceConfig = baseTemplate?.config ?? DEFAULT_REWARDS_CONFIG
  const showReset = baseTemplate?.id !== 'custom' && !isMatchingTemplate(config, referenceConfig)
  const currCfg = getCurrencyConfig(currency)

  const updateTier = (index: number, partial: Partial<TierConfig>) => {
    const tiers = [...config.tiers]
    tiers[index] = { ...tiers[index], ...partial }
    onChange({ ...config, tiers })
  }

  const addTierAfter = (index: number) => {
    if (config.tiers.length >= MAX_TIERS) return
    const tiers = [...config.tiers]
    const prevRate = config.tiers[index]?.cashback_rate ?? 10
    const newTier: TierConfig = {
      // eslint-disable-next-line react-hooks/purity
      slug: `tier_${Date.now()}`,
      name: 'New Tier',
      cashback_rate: prevRate + 5,
      upgrade_trigger: { type: 'total_spend', threshold: currCfg.exampleAmount },
      unlocks_referrals: false,
    }
    tiers.splice(index + 1, 0, newTier)
    onChange({ ...config, tiers })
  }

  const removeTier = (index: number) => {
    if (index === 0) return
    const tiers = config.tiers.filter((_, i) => i !== index)
    onChange({ ...config, tiers })
  }

  const moveTier = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= config.tiers.length) return
    const tiers = [...config.tiers]
    const moving = tiers[index]
    const target = tiers[targetIndex]
    tiers[index] = target
    tiers[targetIndex] = moving

    // Fix triggers: position 0 never has a trigger, others always do
    tiers[0] = { ...tiers[0], upgrade_trigger: undefined }
    for (let i = 1; i < tiers.length; i++) {
      if (!tiers[i].upgrade_trigger) {
        tiers[i] = { ...tiers[i], upgrade_trigger: { type: 'first_purchase' } }
      }
    }

    onChange({ ...config, tiers })
  }

  // Render a single tier card
  const renderTierCard = (tier: TierConfig, globalIndex: number) => {
    const color = TIER_COLOR_PALETTE[globalIndex % TIER_COLOR_PALETTE.length]
    const Icon = TIER_ICONS[globalIndex % TIER_ICONS.length]
    const isFirst = globalIndex === 0
    const isLast = globalIndex === config.tiers.length - 1

    return (
      <div className={`rounded-3xl border-2 ${color.border} ${color.bg} backdrop-blur-sm p-6 space-y-4 relative`}>
        {/* Tier number badge + reorder/remove buttons */}
        <div className="flex items-center justify-between">
          {/* Reorder arrows */}
          <div className="flex items-center gap-1">
            {!isFirst && (
              <button
                onClick={() => moveTier(globalIndex, 'up')}
                className="h-6 w-6 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                title="Move up"
              >
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            {!isLast && (
              <button
                onClick={() => moveTier(globalIndex, 'down')}
                className="h-6 w-6 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                title="Move down"
              >
                <ArrowDown className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${color.text} opacity-70`}>Tier {globalIndex + 1}</span>
            {!isFirst && (
              <button
                onClick={() => removeTier(globalIndex)}
                className="h-6 w-6 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Icon + name */}
        <div className="flex items-center gap-4">
          <div className={`h-16 w-16 rounded-full ${color.bg} border ${color.border} flex items-center justify-center shrink-0`}>
            <Icon className={`h-7 w-7 ${color.text}`} />
          </div>
          <Input
            value={tier.name}
            onChange={(e) => updateTier(globalIndex, { name: e.target.value })}
            className={`text-xl md:text-xl font-bold bg-transparent border-transparent border-dashed hover:border-border/50 focus:border-border h-auto py-1 ${color.text}`}
            placeholder="Tier name"
          />
        </div>

        {/* Hero cashback rate */}
        <div className={`rounded-2xl ${color.bg} border ${color.border} p-4 group/rate cursor-text`}
          onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <Input
                type="number"
                value={tier.cashback_rate}
                onChange={(e) => updateTier(globalIndex, { cashback_rate: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => e.currentTarget.select()}
                min={0}
                max={100}
                step={0.5}
                className={`w-20 h-auto text-3xl md:text-3xl font-black bg-transparent border-b-2 border-dashed border-current/30 focus:border-current/70 p-0 pb-0.5 transition-colors ${color.text} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
              <span className={`text-3xl font-black ${color.text}`}>%</span>
            </div>
            <Pencil className={`h-3.5 w-3.5 ${color.text} opacity-30`} />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-muted-foreground">Cashback on every purchase</span>
            <InfoTip text={globalIndex === 0
              ? 'The cashback % new customers earn on every purchase. They get this as store credit to spend next time.'
              : 'The cashback % customers earn once they reach this tier. Higher tiers = more reason to come back.'
            } />
          </div>
        </div>

        {/* Status line */}
        <p className="text-xs text-muted-foreground">
          {globalIndex === 0 ? 'Everyone starts here' : 'Upgraded tier'}
        </p>

        {/* Card designer hint */}
        <div className="border-t border-dashed border-border/30 pt-3">
          {designerHint === 'link' ? (
            <Link
              href="/wallet/designer"
              className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Design this tier&apos;s wallet card</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>You&apos;ll design this card on the next step</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render connector between two elements with optional trigger
  const renderConnector = (tier: TierConfig | null, globalIndex: number) => {
    const color = TIER_COLOR_PALETTE[globalIndex % TIER_COLOR_PALETTE.length]
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex flex-col items-center gap-1.5">
          <div className={`h-4 border-l-2 border-dashed ${color.border}`} />
          <ArrowDown className={`h-3 w-3 ${color.text} opacity-50`} />
          {tier?.upgrade_trigger && (
            <div className={`rounded-xl border border-dashed ${color.border} bg-secondary/20 px-4 py-2`}>
              <TriggerSelector
                value={tier.upgrade_trigger}
                onChange={(v: UpgradeTriggerConfig) => updateTier(globalIndex, { upgrade_trigger: v })}
                currency={currency}
                compact
              />
            </div>
          )}
          <div className={`h-2 border-l-2 border-dashed ${color.border}`} />
        </div>
      </div>
    )
  }

  // Render add-tier button
  const renderAddButton = (afterIndex: number, label?: string) => {
    if (config.tiers.length >= MAX_TIERS) return null
    return (
      <div className="flex items-center justify-center py-1">
        <button
          onClick={() => addTierAfter(afterIndex)}
          className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-border/50 px-4 py-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* A) Why Cashback Works */}
      {!hideWhyCashbackWorks && <div className="space-y-4">
        <h2 className="text-sm font-semibold">Why Cashback Works</h2>
        {(() => {
          const cfg = getCurrencyConfig(currency)
          const amt = cfg.exampleAmount
          const pct = 15
          const cashbackPerPurchase = amt * pct / 100
          const discountedPrice = amt - cashbackPerPurchase
          const totalCollectedCashback = amt * 3
          const totalCollectedDiscount = discountedPrice * 3
          const totalCashbackEarned = cashbackPerPurchase * 3
          const f = (v: number) => formatAmount(v, cfg)

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cashback */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-[13px] font-semibold text-emerald-400">{pct}% Cashback</span>
                </div>
                <div className="space-y-1">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center justify-between text-[13px] rounded-lg bg-emerald-500/5 px-2.5 py-1">
                      <span className="text-muted-foreground">Session {n}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{f(amt)}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-emerald-400" />
                        <span className="font-semibold text-emerald-400">+{f(cashbackPerPurchase)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-emerald-500/20 pt-2 flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">You collected</span>
                  <span className="font-bold text-emerald-400">{f(totalCollectedCashback)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Customer earned</span>
                  <span className="font-bold text-emerald-400">{f(totalCashbackEarned)} credit</span>
                </div>
                <p className="text-[13px] text-emerald-400/70">Customer must return to spend their credit</p>
              </div>

              {/* Discount */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <BadgePercent className="h-4 w-4 text-red-400" />
                  <span className="text-[13px] font-semibold text-red-400">{pct}% Discount</span>
                </div>
                <div className="space-y-1">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center justify-between text-[13px] rounded-lg bg-red-500/5 px-2.5 py-1">
                      <span className="text-muted-foreground">Session {n}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium line-through text-muted-foreground/50">{f(amt)}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-red-400" />
                        <span className="font-semibold text-red-400">{f(discountedPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-red-500/20 pt-2 flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">You collected</span>
                  <span className="font-bold text-red-400">{f(totalCollectedDiscount)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Customer saved</span>
                  <span className="font-bold text-red-400">{f(totalCashbackEarned)} gone</span>
                </div>
                <p className="text-[13px] text-red-400/70">No reason to return. Money is lost forever.</p>
              </div>
            </div>
          )
        })()}

        {/* Savings summary */}
        {(() => {
          const cfg = getCurrencyConfig(currency)
          const amt = cfg.exampleAmount
          const pct = 15
          const f = (v: number) => formatAmount(v, cfg)
          const cb1 = amt * pct / 100
          const totalCbRevenue = amt + (amt - cb1) + (amt - (amt - cb1) * pct / 100)
          const totalDiscRevenue = (amt - cb1) * 3
          const savings = totalCbRevenue - totalDiscRevenue
          return (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-[13px] font-semibold text-emerald-400">You earn {f(savings)} more with cashback</p>
                <p className="text-[11px] text-muted-foreground">Over just 3 sessions — and cashback is only earned on real spend, not on credit redeemed. Your cost decreases every session.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
            </div>
          )
        })()}
      </div>}

      {/* B) Template defaults banner */}
      {baseTemplate && baseTemplate.id !== 'custom' && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{baseTemplate.name} defaults</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-md">
                {baseTemplate.tagline} Adjust the rates below, or reset back to the template at any time.
              </p>
            </div>
            {showReset && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => onChange(referenceConfig)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to {baseTemplate.name}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* C) Tier Journey Builder */}
      <div>
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold">Build Your Customer Journey</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Each tier is a level your customers can reach. Drag tiers up or down to reorder.
          </p>
        </div>
        <div className="max-w-xl mx-auto space-y-0">
          {config.tiers.map((tier, index) => (
            <div key={tier.slug}>
              {index > 0 && renderConnector(tier, index)}
              {renderTierCard(tier, index)}
              {index < config.tiers.length - 1 && renderAddButton(index)}
            </div>
          ))}

          {/* Add tier at end */}
          {config.tiers.length < MAX_TIERS && (
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => addTierAfter(config.tiers.length - 1)}
                className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-border/50 px-4 py-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add Tier</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

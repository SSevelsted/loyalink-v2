'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRight, BadgePercent, ChevronDown, ChevronUp, Gift, Info, Repeat, Shield, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'
import type { RewardsConfig, UpgradeTrigger, UpgradeTriggerConfig } from '@/types/database'
import { DEFAULT_REWARDS_CONFIG } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type TriggerOption = { value: UpgradeTrigger; label: string; hasThreshold: boolean; suffix?: string; placeholder?: string }

function getTriggerOptions(currency: string): TriggerOption[] {
  const cfg = getCurrencyConfig(currency)
  return [
    { value: 'first_purchase', label: 'After deposit', hasThreshold: false },
    { value: 'first_full_payment', label: 'After first full payment', hasThreshold: false },
    { value: 'total_spend', label: 'After total spend reaches...', hasThreshold: true, suffix: cfg.symbol, placeholder: String(cfg.exampleAmount) },
    { value: 'referral_count', label: 'After referring X friends', hasThreshold: true, suffix: 'referrals', placeholder: '3' },
    { value: 'days_member', label: 'After X days as member', hasThreshold: true, suffix: 'days', placeholder: '30' },
  ]
}

export function getTriggerLabel(trigger: UpgradeTriggerConfig, currency = 'kr'): string {
  const opts = getTriggerOptions(currency)
  const opt = opts.find((o) => o.value === trigger.type)
  if (!opt) return 'Unknown'
  if (!opt.hasThreshold) return opt.label
  return `${opt.label.replace('...', '')} ${trigger.threshold ?? '?'} ${opt.suffix ?? ''}`
}

export function TriggerSelector({
  value,
  onChange,
  currency = 'kr',
  compact = false,
}: {
  value: UpgradeTriggerConfig
  onChange: (v: UpgradeTriggerConfig) => void
  currency?: string
  compact?: boolean
}) {
  const options = getTriggerOptions(currency)
  const selected = options.find((o) => o.value === value.type) ?? options[0]

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={value.type}
          onValueChange={(v: UpgradeTrigger) => {
            const opt = options.find((o) => o.value === v)
            onChange({ type: v, threshold: opt?.hasThreshold ? (value.threshold ?? undefined) : undefined })
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.hasThreshold && (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={value.threshold ?? ''}
              onChange={(e) => onChange({ ...value, threshold: parseFloat(e.target.value) || 0 })}
              placeholder={selected.placeholder}
              min={0}
              step={selected.suffix === 'kr' ? 100 : 1}
              className="w-20 h-7 text-xs"
            />
            <span className="text-xs text-muted-foreground">{selected.suffix}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 p-4 space-y-3">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Upgrade Condition</Label>
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={value.type}
          onValueChange={(v: UpgradeTrigger) => {
            const opt = options.find((o) => o.value === v)
            onChange({ type: v, threshold: opt?.hasThreshold ? (value.threshold ?? undefined) : undefined })
          }}
        >
          <SelectTrigger className="w-[240px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.hasThreshold && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value.threshold ?? ''}
              onChange={(e) => onChange({ ...value, threshold: parseFloat(e.target.value) || 0 })}
              placeholder={selected.placeholder}
              min={0}
              step={selected.suffix === 'kr' ? 100 : 1}
              className="w-24 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">{selected.suffix}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function RewardsConfigForm({
  config: _config, // eslint-disable-line @typescript-eslint/no-unused-vars
  onChange,
  onSave,
  saving,
  showQuickStart = false,
  fromSetup = false,
  currency = 'kr',
  hideHowItWorks = false,
}: {
  config: RewardsConfig
  onChange: (config: RewardsConfig) => void
  onSave?: () => void
  saving?: boolean
  showQuickStart?: boolean
  fromSetup?: boolean
  currency?: string
  hideHowItWorks?: boolean
}) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Quick Start */}
      {showQuickStart && !fromSetup && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Use recommended defaults for a tattoo studio?</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange(DEFAULT_REWARDS_CONFIG)}
          >
            Apply Defaults
          </Button>
        </div>
      )}

      {/* How It Works (collapsible) — hidden during setup (moved to Program Overview step) */}
      {!fromSetup && !hideHowItWorks && (
        <Card variant="glass" className="rounded-2xl">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                How Cashback Works
              </CardTitle>
              {howItWorksOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {howItWorksOpen && (
            <CardContent className="pt-0 space-y-5">
              {/* 3-step flow */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-xs font-medium">Signup</p>
                  <p className="text-xs text-muted-foreground">Customer joins at base rate</p>
                </div>
                <div className="space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-xs font-medium">First Purchase</p>
                  <p className="text-xs text-muted-foreground">Upgrades to next tier</p>
                </div>
                <div className="space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-violet-400" />
                  </div>
                  <p className="text-xs font-medium">Referrals</p>
                  <p className="text-xs text-muted-foreground">Earn more cashback per referral</p>
                </div>
              </div>

              {/* Cashback vs Discount visual comparison */}
              <div className="border-t border-border/50 pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why cashback, not discounts?</p>

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
                      {/* Cashback column */}
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          </div>
                          <span className="text-[13px] font-semibold text-emerald-400">{pct}% Cashback</span>
                        </div>
                        <div className="space-y-1.5">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="flex items-center justify-between text-[13px] rounded-lg bg-emerald-500/5 px-2.5 py-1.5">
                              <span className="text-muted-foreground">Purchase {n}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{f(amt)}</span>
                                <ArrowRight className="h-3 w-3 text-emerald-400" />
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

                      {/* Discount column */}
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <BadgePercent className="h-3.5 w-3.5 text-red-400" />
                          </div>
                          <span className="text-[13px] font-semibold text-red-400">{pct}% Discount</span>
                        </div>
                        <div className="space-y-1.5">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="flex items-center justify-between text-[13px] rounded-lg bg-red-500/5 px-2.5 py-1.5">
                              <span className="text-muted-foreground">Purchase {n}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium line-through text-muted-foreground/50">{f(amt)}</span>
                                <ArrowRight className="h-3 w-3 text-red-400" />
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

                {/* Key advantages */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="rounded-lg bg-secondary/30 p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold">Full Revenue</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You get paid in full every time. The cashback sits as store credit, not a loss.
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Repeat className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold">Return Habit</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Customers come back to spend their balance. Every visit is a new chance to upsell.
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold">Stand Out</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You&apos;re not competing on price. You offer a loyalty experience competitors don&apos;t have.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground"><strong>Real spend only.</strong> Cashback is calculated on what the customer actually pays, not on credit balance. This prevents compounding.</p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Save button */}
      {onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} variant="glow">
            {saving ? 'Saving...' : 'Save Rewards Config'}
          </Button>
        </div>
      )}
    </div>
  )
}

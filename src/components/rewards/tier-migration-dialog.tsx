'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AlertTriangle, ArrowRight, Info, Loader2 } from 'lucide-react'
import type { TierDiff } from '@/lib/tier-diff'
import { findClosestTier } from '@/lib/tier-diff'
import type { RewardsConfig } from '@/types/database'

export type TierMigration = {
  mappings: Record<string, string>
  applyRateChanges: boolean
  applyToExisting: boolean
}

type TierMigrationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  diff: TierDiff
  newConfig: RewardsConfig
  memberCounts: Record<string, number>
  promotionCounts: Record<string, number>
  onConfirm: (migration: TierMigration) => void
  loading?: boolean
}

export function TierMigrationDialog({
  open,
  onOpenChange,
  diff,
  newConfig,
  memberCounts,
  promotionCounts,
  onConfirm,
  loading,
}: TierMigrationDialogProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const tier of diff.removedTiers) {
      initial[tier.slug] = findClosestTier(tier, newConfig.tiers)
    }
    return initial
  })
  const [applyRateChanges, setApplyRateChanges] = useState(true)
  const [applyToExisting, setApplyToExisting] = useState(true)

  const totalAffectedMembers = useMemo(() => {
    let count = 0
    for (const tier of diff.removedTiers) {
      count += memberCounts[tier.slug] ?? 0
    }
    if (applyRateChanges) {
      for (const tier of diff.rateChangedTiers) {
        count += memberCounts[tier.slug] ?? 0
      }
    }
    return count
  }, [diff, memberCounts, applyRateChanges])

  const totalAffectedPromotions = useMemo(() => {
    let count = 0
    for (const tier of diff.removedTiers) {
      count += promotionCounts[tier.slug] ?? 0
    }
    return count
  }, [diff, promotionCounts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Tier Changes Detected
          </DialogTitle>
          <DialogDescription>
            Your changes affect existing tiers. Choose how to handle current members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Removed tiers — mapping UI */}
          {diff.removedTiers.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Removed Tiers</p>
              {diff.removedTiers.map((tier) => {
                const count = memberCounts[tier.slug] ?? 0
                return (
                  <div key={tier.slug} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{tier.name}</span>
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Removed
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {count} {count === 1 ? 'member' : 'members'} &middot; {tier.cashback_rate}% cashback
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                      value={mappings[tier.slug] ?? ''}
                      onValueChange={(v) => setMappings((prev) => ({ ...prev, [tier.slug]: v }))}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {newConfig.tiers.map((t) => (
                          <SelectItem key={t.slug} value={t.slug}>
                            {t.name} ({t.cashback_rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          )}

          {/* Rate changes */}
          {diff.rateChangedTiers.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Rate Changes</p>
              {diff.rateChangedTiers.map((tier) => {
                const count = memberCounts[tier.slug] ?? 0
                return (
                  <div key={tier.slug} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{tier.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {tier.oldRate}% → {tier.newRate}%
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {count} {count === 1 ? 'member' : 'members'}
                    </Badge>
                  </div>
                )
              })}
              <div className="flex items-center gap-2">
                <Switch
                  id="apply-rate-changes"
                  checked={applyRateChanges}
                  onCheckedChange={setApplyRateChanges}
                />
                <Label htmlFor="apply-rate-changes" className="text-sm">
                  Update existing members&apos; cashback rates
                </Label>
              </div>
            </div>
          )}

          {/* Apply scope */}
          <div className="flex items-center gap-2 rounded-lg border border-border p-3">
            <Switch
              id="apply-to-existing"
              checked={applyToExisting}
              onCheckedChange={setApplyToExisting}
            />
            <Label htmlFor="apply-to-existing" className="text-sm">
              Apply to all existing members
              {applyToExisting && totalAffectedMembers > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({totalAffectedMembers} {totalAffectedMembers === 1 ? 'member' : 'members'} affected)
                </span>
              )}
            </Label>
          </div>

          {/* Promotion warning */}
          {totalAffectedPromotions > 0 && applyToExisting && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {totalAffectedPromotions} active {totalAffectedPromotions === 1 ? 'promotion' : 'promotions'} reference
                these tiers. Their snapshot data will be updated so promotions revert correctly.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm({ mappings, applyRateChanges, applyToExisting })} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save & Migrate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

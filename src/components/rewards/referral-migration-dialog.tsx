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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Info, Loader2 } from 'lucide-react'
import type { ReferralDiff } from '@/lib/referral-diff'

export type ReferralMigration = {
  applyFriendRate: boolean
  applyCommissionDuration: boolean
}

type ReferralMigrationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  diff: ReferralDiff
  referredFriends: number
  activeReferrals: number
  onConfirm: (migration: ReferralMigration) => void
  loading?: boolean
}

export function ReferralMigrationDialog({
  open,
  onOpenChange,
  diff,
  referredFriends,
  activeReferrals,
  onConfirm,
  loading,
}: ReferralMigrationDialogProps) {
  const [applyFriendRate, setApplyFriendRate] = useState(true)
  const [applyCommissionDuration, setApplyCommissionDuration] = useState(true)

  const hasAnythingToApply = useMemo(() => {
    return (
      (diff.friendRateChanged && applyFriendRate) ||
      (diff.commissionDurationChanged && applyCommissionDuration)
    )
  }, [diff, applyFriendRate, applyCommissionDuration])

  const formatDuration = (days: number) =>
    days === 0 ? 'Unlimited' : `${days} day${days === 1 ? '' : 's'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Referral Changes Detected
          </DialogTitle>
          <DialogDescription>
            Your changes affect referral settings. Choose how to handle existing referrals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Friend cashback rate change */}
          {diff.friendRateChanged && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Friend Cashback Rate</p>
                  <p className="text-xs text-muted-foreground">
                    {diff.friendRateChanged.oldRate}% → {diff.friendRateChanged.newRate}%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {referredFriends} {referredFriends === 1 ? 'member' : 'members'} on friend tier
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="apply-friend-rate"
                  checked={applyFriendRate}
                  onCheckedChange={setApplyFriendRate}
                />
                <Label htmlFor="apply-friend-rate" className="text-sm">
                  Update existing referred members&apos; cashback rates
                </Label>
              </div>
            </div>
          )}

          {/* Commission duration change */}
          {diff.commissionDurationChanged && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Commission Duration</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(diff.commissionDurationChanged.oldDays)} →{' '}
                    {formatDuration(diff.commissionDurationChanged.newDays)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeReferrals} active {activeReferrals === 1 ? 'referral' : 'referrals'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="apply-commission-duration"
                  checked={applyCommissionDuration}
                  onCheckedChange={setApplyCommissionDuration}
                />
                <Label htmlFor="apply-commission-duration" className="text-sm">
                  Recalculate expiry for active referrals
                </Label>
              </div>
            </div>
          )}

          {/* Info note */}
          {hasAnythingToApply && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Changes that are not toggled on will only apply to new referrals going forward.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm({ applyFriendRate, applyCommissionDuration })}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save & Apply'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

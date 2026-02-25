'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Gift, Percent, MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ContentAction = {
  announcement?: string
  action: 'none' | 'add_balance' | 'cashback_boost'
  amount?: number
  cashback_rate?: number
  cashback_duration_days?: number
}

const DEFAULT_CONTENT: ContentAction = { action: 'none' }

interface ContentActionFormProps {
  value: ContentAction
  onChange: (content: ContentAction) => void
}

const ACTIONS = [
  { id: 'none' as const, label: 'Notification Only', description: 'Message on the pass', icon: MessageSquareText },
  { id: 'add_balance' as const, label: 'Add Balance', description: 'Credit amount to wallet', icon: Gift },
  { id: 'cashback_boost' as const, label: 'Cashback Boost', description: 'Temporary rate increase', icon: Percent },
] as const

export function ContentActionForm({ value, onChange }: ContentActionFormProps) {
  const content = { ...DEFAULT_CONTENT, ...value }

  const update = (patch: Partial<ContentAction>) => {
    onChange({ ...content, ...patch })
  }

  return (
    <div className="space-y-4">
      {/* Announcement / message */}
      <div className="space-y-2">
        <Label>Announcement Text</Label>
        <Textarea
          placeholder="e.g. Happy birthday! Here's a little gift from us"
          rows={2}
          value={content.announcement ?? ''}
          onChange={e => update({ announcement: e.target.value || undefined })}
          required
        />
        <p className="text-xs text-muted-foreground">Shown on the customer&apos;s wallet pass</p>
      </div>

      {/* Action type */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Action</Label>
        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map(action => {
            const Icon = action.icon
            const selected = content.action === action.id
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => update({ action: action.id, amount: undefined, cashback_rate: undefined, cashback_duration_days: undefined })}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors',
                  selected
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Add Balance config */}
      {content.action === 'add_balance' && (
        <div className="space-y-2">
          <Label>Amount to credit</Label>
          <Input
            type="number"
            min={1}
            placeholder="50"
            value={content.amount ?? ''}
            onChange={e => update({ amount: e.target.value ? Number(e.target.value) : undefined })}
          />
          <p className="text-xs text-muted-foreground">Each customer receives this amount in their wallet balance</p>
        </div>
      )}

      {/* Cashback Boost config */}
      {content.action === 'cashback_boost' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Bonus Rate (%)</Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              placeholder="5"
              value={content.cashback_rate ?? ''}
              onChange={e => update({ cashback_rate: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration (days)</Label>
            <Input
              type="number"
              min={1}
              placeholder="30"
              value={content.cashback_duration_days ?? ''}
              onChange={e => update({ cashback_duration_days: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Adds this bonus on top of the customer&apos;s current cashback rate for the specified number of days
          </p>
        </div>
      )}
    </div>
  )
}

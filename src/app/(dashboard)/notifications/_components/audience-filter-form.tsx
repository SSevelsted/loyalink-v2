'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useRewardsConfig } from '@/hooks/use-rewards'
import type { AudienceFilter } from '@/types/database'

interface AudienceFilterFormProps {
  value: AudienceFilter
  onChange: (filter: AudienceFilter) => void
}

export function AudienceFilterForm({ value, onChange }: AudienceFilterFormProps) {
  const { data: rewardsConfig } = useRewardsConfig()
  const tiers = rewardsConfig?.tiers ?? []

  const update = (key: keyof AudienceFilter, val: unknown) => {
    onChange({ ...value, [key]: val })
  }

  const toggleTier = (slug: string) => {
    const current = value.loyalty_stages ?? []
    const next = current.includes(slug)
      ? current.filter(s => s !== slug)
      : [...current, slug]
    update('loyalty_stages', next.length ? next : undefined)
  }

  return (
    <div className="space-y-4">
      {/* Tier filter */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Loyalty Tiers</Label>
        <div className="flex flex-wrap gap-1.5">
          {tiers.map(tier => {
            const selected = value.loyalty_stages?.includes(tier.slug)
            return (
              <Badge
                key={tier.slug}
                variant="outline"
                className={`cursor-pointer transition-colors ${
                  selected
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'hover:bg-secondary'
                }`}
                onClick={() => toggleTier(tier.slug)}
              >
                {tier.name}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Tags (comma separated)</Label>
        <Input
          placeholder="vip, loyal, new"
          value={value.tags?.join(', ') ?? ''}
          onChange={e => {
            const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
            update('tags', tags.length ? tags : undefined)
          }}
        />
      </div>

      {/* Balance + Spend */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Min Balance</Label>
          <Input
            type="number"
            placeholder="0"
            value={value.min_balance ?? ''}
            onChange={e => update('min_balance', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Min Total Spend</Label>
          <Input
            type="number"
            placeholder="0"
            value={value.min_spend ?? ''}
            onChange={e => update('min_spend', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* Join dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Joined After</Label>
          <Input
            type="date"
            value={value.joined_after ?? ''}
            onChange={e => update('joined_after', e.target.value || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Joined Before</Label>
          <Input
            type="date"
            value={value.joined_before ?? ''}
            onChange={e => update('joined_before', e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  )
}

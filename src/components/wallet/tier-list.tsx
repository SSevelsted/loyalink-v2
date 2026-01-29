'use client'

import type { TierTheme } from '@/types/database'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TierListProps = {
  tiers: Record<string, TierTheme>
  selectedTier: string
  onSelect: (slug: string) => void
  onAddTier: () => void
}

export function TierList({ tiers, selectedTier, onSelect, onAddTier }: TierListProps) {
  const sorted = Object.entries(tiers).sort(
    ([, a], [, b]) => a.sortOrder - b.sortOrder
  )

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground uppercase tracking-wider px-1 mb-2 block">
        Tiers
      </label>
      {sorted.map(([slug, tier]) => (
        <button
          key={slug}
          onClick={() => onSelect(slug)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
            selectedTier === slug
              ? 'bg-primary/10 border border-primary/20'
              : 'hover:bg-secondary/50 border border-transparent'
          )}
        >
          <div
            className="h-4 w-4 rounded-full border border-border/50 shrink-0"
            style={{ backgroundColor: tier.backgroundColor }}
          />
          <span className="text-sm font-medium text-foreground truncate">
            {tier.name}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {slug}
          </span>
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddTier}
        className="w-full mt-2 gap-1.5 text-muted-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add tier
      </Button>
    </div>
  )
}

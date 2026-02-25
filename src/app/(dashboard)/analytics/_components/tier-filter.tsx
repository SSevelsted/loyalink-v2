'use client'

import { cn } from '@/lib/utils'
import type { TierConfig } from '@/types/database'
import { TIER_COLOR_PALETTE } from '@/types/database'

type TierFilterProps = {
  value: string | null
  onChange: (tier: string | null) => void
  tiers: TierConfig[]
}

export function TierFilter({ value, onChange, tiers }: TierFilterProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onChange(null)}
        className={cn(
          'rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
          value === null
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        )}
      >
        All tiers
      </button>
      {tiers.map((tier, i) => {
        const isActive = value === tier.slug
        const color = TIER_COLOR_PALETTE[i % TIER_COLOR_PALETTE.length]
        return (
          <button
            key={tier.slug}
            onClick={() => onChange(tier.slug)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', color.dot)} />
            {tier.name}
          </button>
        )
      })}
    </nav>
  )
}

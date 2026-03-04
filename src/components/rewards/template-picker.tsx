'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REWARD_TEMPLATES, type TemplateId } from '@/lib/rewards-templates'

type TemplatePickerProps = {
  selected: TemplateId
  onSelect: (id: TemplateId) => void
}

export function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Choose a Starting Point</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Pick a template — you can edit everything below.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REWARD_TEMPLATES.map((template) => {
          const isSelected = selected === template.id
          const isRecommended = template.id === 'classic'
          const isCustom = template.id === 'custom'

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={cn(
                'relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/50 bg-card'
              )}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Star className="h-2.5 w-2.5" />
                  Recommended
                </span>
              )}

              <span className={cn(
                'text-sm font-semibold',
                isSelected ? 'text-primary' : 'text-foreground'
              )}>
                {template.name}
              </span>

              {!isCustom ? (
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Tiers</span>
                    <span className="font-medium">{template.tierCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Cashback</span>
                    <span className="font-medium">{template.cashbackRange}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Referrals</span>
                    <span className="font-medium text-emerald-500">On</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Start from scratch</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

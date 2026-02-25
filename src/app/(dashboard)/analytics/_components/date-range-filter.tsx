'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import type { DatePreset } from '@/hooks/use-analytics'
import type { DateRange } from 'react-day-picker'

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
]

type DateRangeFilterProps = {
  value: DatePreset
  onChange: (preset: DatePreset) => void
  customRange?: { from: string; to: string }
  onCustomRangeChange?: (range: { from: string; to: string }) => void
}

function formatCompactDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function DateRangeFilter({ value, onChange, customRange, onCustomRangeChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (customRange) {
      return { from: new Date(customRange.from), to: new Date(customRange.to) }
    }
    return undefined
  })

  const isCustomActive = value === 'custom'
  const canApply = range?.from && range?.to

  function handleApply() {
    if (!range?.from || !range?.to) return
    const from = new Date(range.from)
    from.setHours(0, 0, 0, 0)
    const to = new Date(range.to)
    to.setHours(23, 59, 59, 999)
    onCustomRangeChange?.({ from: from.toISOString(), to: to.toISOString() })
    onChange('custom')
    setOpen(false)
  }

  const customLabel = isCustomActive && customRange
    ? `${formatCompactDate(customRange.from)} – ${formatCompactDate(customRange.to)}`
    : 'Custom'

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {PRESETS.map((preset) => {
        const isActive = value === preset.value
        return (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {preset.label}
          </button>
        )
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              isCustomActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <div className="p-3 space-y-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              // eslint-disable-next-line react-hooks/purity
          defaultMonth={range?.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
            />
            <div className="flex items-center justify-between border-t border-border pt-3 px-1">
              <p className="text-xs text-muted-foreground">
                {range?.from && range?.to
                  ? `${formatCompactDate(range.from.toISOString())} – ${formatCompactDate(range.to.toISOString())}`
                  : 'Select a date range'}
              </p>
              <Button size="sm" onClick={handleApply} disabled={!canApply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </nav>
  )
}

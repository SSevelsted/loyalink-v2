import type { TierConfig } from '@/types/database'
import { getTriggerDisplayText } from '@/lib/format'

type Props = {
  tiers: TierConfig[]
  currency: string
  brandColor: string
  textColor: string
}

export function TierProgression({ tiers, currency, brandColor, textColor }: Props) {
  if (tiers.length < 2) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-center" style={{ color: textColor }}>
        Your Cashback Journey
      </p>
      <div className="relative pl-6">
        {tiers.map((tier, i) => {
          const isFirst = i === 0
          const isLast = i === tiers.length - 1
          // Increasing opacity for higher tiers
          const opacity = 0.4 + (i / (tiers.length - 1)) * 0.6

          return (
            <div key={tier.slug} className="relative pb-4 last:pb-0">
              {/* Connecting line */}
              {!isLast && (
                <div
                  className="absolute left-0 top-3 w-px"
                  style={{
                    backgroundColor: `${brandColor}30`,
                    height: 'calc(100% - 4px)',
                    transform: 'translateX(-1px)',
                  }}
                />
              )}

              {/* Dot */}
              <div
                className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full -translate-x-[5px]"
                style={{ backgroundColor: brandColor, opacity }}
              />

              {/* Content */}
              <div className="pl-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold" style={{ color: textColor }}>
                    {tier.name}
                  </span>
                  <span className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                    — <strong>{tier.cashback_rate}%</strong> cashback
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: textColor, opacity: 0.5 }}>
                  {isFirst
                    ? 'Start here'
                    : tier.upgrade_trigger
                      ? getTriggerDisplayText(tier.upgrade_trigger, currency)
                      : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

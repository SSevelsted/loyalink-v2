import { Gift } from 'lucide-react'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type Props = {
  referrerName: string
  friendWelcomeBonus: number
  friendCashbackRate: number
  currency: string
  brandColor: string
  textColor: string
}

export function ReferralBanner({
  referrerName,
  friendWelcomeBonus,
  friendCashbackRate,
  currency,
  brandColor,
  textColor,
}: Props) {
  const cfg = getCurrencyConfig(currency)

  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ backgroundColor: `${brandColor}15`, borderLeft: `3px solid ${brandColor}` }}
    >
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5" style={{ color: brandColor }} />
        <p className="text-sm font-semibold" style={{ color: textColor }}>
          {referrerName} invited you!
        </p>
      </div>
      <ul className="space-y-1 pl-7">
        {friendWelcomeBonus > 0 && (
          <li className="text-sm list-disc" style={{ color: textColor, opacity: 0.85 }}>
            <strong>{formatAmount(friendWelcomeBonus, cfg)}</strong> welcome bonus
          </li>
        )}
        <li className="text-sm list-disc" style={{ color: textColor, opacity: 0.85 }}>
          <strong>{friendCashbackRate}%</strong> cashback from day one
        </li>
      </ul>
    </div>
  )
}

import { Gift } from 'lucide-react'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { getSignupTranslations } from '@/lib/i18n/signup'

type Props = {
  referrerName: string
  friendWelcomeBonus: number
  friendCashbackRate: number
  currency: string
  brandColor: string
  textColor: string
  language?: string
}

export function ReferralBanner({
  referrerName,
  friendWelcomeBonus,
  friendCashbackRate,
  currency,
  brandColor,
  textColor,
  language,
}: Props) {
  const cfg = getCurrencyConfig(currency)
  const t = getSignupTranslations(language)
  // Split the "X% cashback from day one" line around the rate so the percentage
  // can be bolded without us writing a separate React fragment per language.
  const cashbackLine = t.cashbackFromDayOneLabel(friendCashbackRate)
  const cashbackParts = cashbackLine.split(`${friendCashbackRate}%`)

  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ backgroundColor: `${brandColor}15`, borderLeft: `3px solid ${brandColor}` }}
    >
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5" style={{ color: brandColor }} />
        <p className="text-sm font-semibold" style={{ color: textColor }}>
          {t.invitedYou(referrerName)}
        </p>
      </div>
      <ul className="space-y-1 pl-7">
        {friendWelcomeBonus > 0 && (
          <li className="text-sm list-disc" style={{ color: textColor, opacity: 0.85 }}>
            <strong>{formatAmount(friendWelcomeBonus, cfg)}</strong> {t.welcomeBonusLabel}
          </li>
        )}
        <li className="text-sm list-disc" style={{ color: textColor, opacity: 0.85 }}>
          {cashbackParts.length === 2 ? (
            <>
              {cashbackParts[0]}<strong>{friendCashbackRate}%</strong>{cashbackParts[1]}
            </>
          ) : (
            cashbackLine
          )}
        </li>
      </ul>
    </div>
  )
}

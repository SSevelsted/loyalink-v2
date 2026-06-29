import {
  CheckCircle, TrendingUp, Users, Gift, Wallet, Zap,
  Star, Heart, Sparkles, Crown, Shield, Gem, Trophy, PartyPopper, Coffee, Calendar,
} from 'lucide-react'
import type { RewardsConfig } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { getSignupTranslations, type SignupTranslations } from '@/lib/i18n/signup'
import type { LucideIcon } from 'lucide-react'
import type { Benefit } from '@/hooks/use-landing-page'

/** Icon map — studios pick from these for their benefit rows */
export const BENEFIT_ICON_MAP: Record<string, LucideIcon> = {
  check: CheckCircle,
  trending: TrendingUp,
  users: Users,
  gift: Gift,
  wallet: Wallet,
  zap: Zap,
  star: Star,
  heart: Heart,
  sparkles: Sparkles,
  crown: Crown,
  shield: Shield,
  gem: Gem,
  trophy: Trophy,
  party: PartyPopper,
  coffee: Coffee,
  calendar: Calendar,
}

export const BENEFIT_ICON_OPTIONS = Object.keys(BENEFIT_ICON_MAP)

const RATE_DERIVED_BENEFIT_IDS = new Set(['base_cashback', 'max_cashback', 'referral_commission', 'welcome_bonus'])

function getReferralBenefitText(
  referrals: RewardsConfig['referrals'],
  cfg: ReturnType<typeof getCurrencyConfig>,
  t: SignupTranslations,
) {
  if (referrals.referrer_commission_rate > 0) {
    if (referrals.referrer_commission_type === 'fixed') {
      return t.benefitReferralFixedCommission(formatAmount(referrals.referrer_commission_rate, cfg))
    }

    return t.benefitReferralCommission(referrals.referrer_commission_rate)
  }

  if (referrals.referrer_cashback_bonus_per_ref > 0) {
    return t.benefitReferralCashbackBoost(referrals.referrer_cashback_bonus_per_ref)
  }

  return t.benefitReferralInvite
}

/**
 * Extract the numeric tokens from a benefit string (e.g. "5% cashback on every
 * Tattoo" → "5"). Thousands/decimal separators inside a number are collapsed so
 * locale formatting ("1.000", "1,000", "1000") compares equal.
 */
function extractRateTokens(text: string): string {
  return text
    .replace(/(?<=\d)[.,\s](?=\d)/g, '')
    .match(/\d+/g)
    ?.join('|') ?? ''
}

/**
 * True when a rate-derived benefit's numbers no longer match the current rewards
 * config — i.e. the studio changed a cashback/referral rate but the saved benefit
 * text still shows the old number. Customised wording (same numbers) does NOT
 * count as out of sync, so edited copy never triggers a false warning.
 */
export function benefitRatesOutOfSync(
  benefits: Benefit[] | null | undefined,
  generatedBenefits: Benefit[],
): boolean {
  if (!benefits) return false
  return [...RATE_DERIVED_BENEFIT_IDS].some((id) => {
    const stored = benefits.find((b) => b.id === id)
    const generated = generatedBenefits.find((b) => b.id === id)
    if (!stored || !generated) return false
    return extractRateTokens(stored.text) !== extractRateTokens(generated.text)
  })
}

/**
 * Generate the default benefits list from a rewards config.
 * Returns plain-text strings, translated to the studio language, that the
 * studio can later edit freely. The IDs stay stable so saved customisations
 * survive a language switch.
 */
export function generateDefaultBenefits(
  rewardsConfig: RewardsConfig,
  currency: string,
  language?: string,
): Benefit[] {
  const baseTier = rewardsConfig.tiers[0]
  const maxTier = rewardsConfig.tiers[rewardsConfig.tiers.length - 1]
  const hasMultipleTiers = rewardsConfig.tiers.length >= 2
  const referrals = rewardsConfig.referrals
  const cfg = getCurrencyConfig(currency)
  const t = getSignupTranslations(language)

  const benefits: Benefit[] = []

  benefits.push({
    id: 'base_cashback',
    icon: 'check',
    text: t.benefitBaseCashback(baseTier.cashback_rate),
  })

  if (hasMultipleTiers) {
    benefits.push({
      id: 'max_cashback',
      icon: 'trending',
      text: t.benefitMaxCashback(maxTier.cashback_rate),
    })
  }

  if (referrals.enabled) {
    benefits.push({
      id: 'referral_commission',
      icon: 'users',
      text: getReferralBenefitText(referrals, cfg, t),
    })
  }

  if (referrals.enabled && referrals.friend_welcome_bonus > 0) {
    benefits.push({
      id: 'welcome_bonus',
      icon: 'gift',
      text: t.benefitWelcomeBonus(formatAmount(referrals.friend_welcome_bonus, cfg)),
    })
  }

  benefits.push({
    id: 'wallet_card',
    icon: 'wallet',
    text: t.benefitWalletCard,
  })

  benefits.push({
    id: 'instant_signup',
    icon: 'zap',
    text: t.benefitInstantSignup,
  })

  return benefits
}

type Props = {
  benefits: Benefit[]
  brandColor: string
  textColor: string
  language?: string
}

export function ValueStack({ benefits, brandColor, textColor, language }: Props) {
  if (benefits.length === 0) return null
  const t = getSignupTranslations(language)

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: `${brandColor}08` }}
    >
      <p className="text-sm font-semibold text-center" style={{ color: textColor }}>
        {t.whatYouGet}
      </p>
      <div className="space-y-2.5">
        {benefits.map((b) => {
          const Icon = BENEFIT_ICON_MAP[b.icon] ?? Star
          return (
            <div key={b.id} className="flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: brandColor }} />
              <span className="text-sm leading-snug" style={{ color: textColor }}>
                {b.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

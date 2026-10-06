'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Gift } from 'lucide-react'
import { JoinForm, type JoinSuccess } from '@/components/landing/join-form'
import { getGiftTranslations } from '@/lib/i18n/gift'
import { getSignupTranslations } from '@/lib/i18n/signup'
import { detectWalletPlatform, openWalletPass } from '@/lib/wallet-pass-client'

type Props = {
  studioId: string
  studioName: string
  logoSrc: string | null
  landingPageId: string
  giverFirstName: string
  /** friend_welcome_bonus formatted in the giver's currency; null when there is none. */
  bonusLabel: string | null
  /** The friend's cashback rate (referrals.friend_cashback_rate). */
  rate: number
  brandColor: string
  backgroundColor?: string
  textColor?: string
  referralCode: string
  language: string
  defaultCountry?: string
}

type Step = 'gift' | 'claim' | 'ready'

/**
 * The friend's landing page: a gift from the client, in 3 steps on one URL.
 *   gift   what the friend gets, one button
 *   claim  name + phone (no email)
 *   ready  the card: Add to Apple / Google Wallet
 */
export function GiftFlow({
  studioId,
  studioName,
  logoSrc,
  landingPageId,
  giverFirstName,
  bonusLabel,
  rate,
  brandColor,
  backgroundColor,
  textColor,
  referralCode,
  language,
  defaultCountry,
}: Props) {
  const g = getGiftTranslations(language)
  const [step, setStep] = useState<Step>('gift')
  const [joined, setJoined] = useState<JoinSuccess | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const hasBonus = bonusLabel != null
  const text = textColor ? { color: textColor } : undefined
  const muted = textColor ? { color: textColor, opacity: 0.65 } : { color: 'var(--muted-foreground)' }
  const quiet = textColor ? { color: textColor, opacity: 0.45 } : { color: 'var(--muted-foreground)', opacity: 0.8 }

  return (
    <div className="min-h-dvh" style={{ backgroundColor }}>
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pb-10 pt-8">
        {/* Studio, small */}
        <div className="flex items-center justify-center gap-2.5">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : null}
          <span className="text-sm font-medium" style={muted}>{studioName}</span>
        </div>

        {step === 'gift' && (
          <>
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
              <IconCircle color={brandColor}>
                <Gift className="h-8 w-8" style={{ color: brandColor }} />
              </IconCircle>
              <p className="mt-6 text-base" style={muted}>{g.giftFrom(giverFirstName)}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-balance" style={text}>
                {hasBonus ? g.bonusOnYourCard(bonusLabel!) : g.cashbackAt(rate, studioName)}
              </h1>
              {hasBonus && (
                <p className="mt-3 text-lg" style={muted}>{g.plusCashbackAt(rate, studioName)}</p>
              )}
              <button
                type="button"
                onClick={() => setStep('claim')}
                className="mt-10 h-14 w-full rounded-2xl text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: brandColor }}
              >
                {g.claimMyGift}
              </button>
            </div>

            {/* How it works: quiet */}
            <div className="space-y-4">
              <p className="text-center text-sm font-medium" style={muted}>{g.howItWorks}</p>
              <ol className="space-y-3">
                {[
                  g.howClaim,
                  g.howBook(studioName),
                  hasBonus ? g.howOnCardBonus(bonusLabel!, rate) : g.howOnCardRate(rate),
                ].map((line, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={muted}>
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${brandColor}22`, color: brandColor }}
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{line}</span>
                  </li>
                ))}
              </ol>
              <p className="pt-4 text-center text-xs" style={quiet}>{g.trustLine}</p>
            </div>
          </>
        )}

        {step === 'claim' && (
          <div className="flex flex-1 flex-col pt-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              type="button"
              onClick={() => setStep('gift')}
              className="-ml-1 flex items-center gap-1 self-start text-sm transition-opacity hover:opacity-80"
              style={muted}
            >
              <ChevronLeft className="h-4 w-4" />
              {g.back}
            </button>
            <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance" style={text}>
              {g.whereToSend}
            </h1>
            <div className="mt-6">
              <JoinForm
                studioId={studioId}
                landingPageId={landingPageId}
                brandColor={brandColor}
                backgroundColor={backgroundColor}
                textColor={textColor}
                buttonText={g.getMyCard}
                showEmail={false}
                showPhone
                bare
                referralCode={referralCode}
                language={language}
                defaultCountry={defaultCountry}
                onSuccess={(result) => {
                  setJoined(result)
                  setStep('ready')
                }}
              />
            </div>
          </div>
        )}

        {step === 'ready' && joined && (
          <ReadyStep
            joined={joined}
            // The bonus is credited only when the referral linked (member-service).
            bonusLabel={hasBonus && joined.referralLinked !== false ? bonusLabel : null}
            studioName={studioName}
            brandColor={brandColor}
            textColor={textColor}
            language={language}
          />
        )}
      </div>
    </div>
  )
}

function IconCircle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}40` }}
    >
      {children}
    </div>
  )
}

function ReadyStep({
  joined,
  bonusLabel,
  studioName,
  brandColor,
  textColor,
  language,
}: {
  joined: JoinSuccess
  bonusLabel: string | null
  studioName: string
  brandColor: string
  textColor?: string
  language: string
}) {
  const g = getGiftTranslations(language)
  const t = getSignupTranslations(language)
  const [platform, setPlatform] = useState<'apple' | 'google'>(joined.platform)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectWalletPlatform())
  }, [])

  const text = textColor ? { color: textColor } : undefined
  const muted = textColor ? { color: textColor, opacity: 0.65 } : { color: 'var(--muted-foreground)' }
  const other = platform === 'apple' ? 'google' : 'apple'

  const add = async (target: 'apple' | 'google') => {
    if (opening) return
    setOpening(true)
    await openWalletPass({
      customerId: joined.customerId,
      customerAccessToken: joined.customerAccessToken,
      passUrl: joined.passUrl,
      passPlatform: joined.platform,
      targetPlatform: target,
    })
    setOpening(false)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 fade-in duration-500">
      <IconCircle color={brandColor}>
        <Check className="h-9 w-9" style={{ color: brandColor }} strokeWidth={2.5} />
      </IconCircle>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-balance" style={text}>
        {bonusLabel ? g.bonusWaiting(bonusLabel) : g.cardReady}
      </h1>
      <p className="mt-3 text-base text-balance" style={muted}>{g.addCardLine(studioName)}</p>

      <button
        type="button"
        onClick={() => add(platform)}
        disabled={opening}
        className="mt-10 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
        style={{ backgroundColor: brandColor }}
      >
        <WalletIcon platform={platform} />
        {opening ? t.opening : t.addToWallet(platform)}
      </button>
      <button
        type="button"
        onClick={() => add(other)}
        disabled={opening}
        className="mt-4 text-sm underline transition-opacity hover:opacity-80 disabled:opacity-40"
        style={muted}
      >
        {t.addToWallet(other)}
      </button>
    </div>
  )
}

function WalletIcon({ platform }: { platform: 'apple' | 'google' }) {
  if (platform === 'apple') {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.23-.98 2.28-2.08 2.97l3.36 2.61c1.96-1.81 3.09-4.47 3.09-7.63 0-.64-.06-1.25-.17-1.84z" />
      <path d="M12.17 22c2.79 0 5.13-.92 6.84-2.5l-3.36-2.61c-.92.62-2.1.99-3.48.99-2.68 0-4.95-1.81-5.76-4.24l-3.44 2.66C4.73 19.78 8.17 22 12.17 22z" />
      <path d="M6.41 13.64c-.21-.62-.33-1.28-.33-1.96s.12-1.35.33-1.96L2.97 7.06C2.06 8.87 1.5 10.87 1.5 13s.56 4.13 1.47 5.94l3.44-2.66z" />
      <path d="M12.17 5.44c1.51 0 2.87.52 3.94 1.54l2.96-2.96C17.3 2.31 14.96 1.28 12.17 1.28 8.17 1.28 4.73 3.5 2.97 7.06l3.44 2.66c.81-2.43 3.08-4.28 5.76-4.28z" />
    </svg>
  )
}

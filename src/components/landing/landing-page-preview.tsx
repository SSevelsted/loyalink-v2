'use client'

import { useState } from 'react'
import type { LandingPageSettings } from '@/hooks/use-landing-page'
import type { RewardsConfig } from '@/types/database'
import { Star } from 'lucide-react'
import { generateDefaultBenefits, BENEFIT_ICON_MAP, syncGeneratedBenefitTexts } from '@/components/landing/value-stack'
import { getTriggerDisplayText } from '@/lib/format'
import { getSignupTranslations } from '@/lib/i18n/signup'

type Props = {
  headline: string
  description: string
  settings: LandingPageSettings
  rewardsConfig?: RewardsConfig
  currency?: string
  /** Studio language — preview renders in this so the studio sees what their customers will. */
  language?: string
}

function MockInput({ label, textColor }: { label: string; textColor: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium opacity-60" style={{ color: textColor }}>{label}</p>
      <div className="h-8 rounded-md bg-white/10 border border-white/20" />
    </div>
  )
}

export function LandingPagePreview({ headline, description, settings, rewardsConfig, currency, language }: Props) {
  const [view, setView] = useState<'form' | 'success'>('form')
  const t = getSignupTranslations(language)

  // Resolve benefits: use saved ones, or generate defaults
  const generatedBenefits = rewardsConfig ? generateDefaultBenefits(rewardsConfig, currency ?? 'dkk', language) : []
  const benefits = settings.benefits
    ? syncGeneratedBenefitTexts(settings.benefits, generatedBenefits)
    : generatedBenefits

  const visibleBenefits = benefits.filter((b) => b.text)

  // Tier progression
  const tiers = rewardsConfig?.tiers ?? []
  const showTiers = (settings.showTierProgression ?? true) && tiers.length >= 2

  return (
    <div className="space-y-2">
      {/* View toggle */}
      <div className="flex rounded-lg bg-secondary/50 p-0.5">
        <button
          type="button"
          onClick={() => setView('form')}
          className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors ${
            view === 'form' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          Signup
        </button>
        <button
          type="button"
          onClick={() => setView('success')}
          className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors ${
            view === 'success' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          After signup
        </button>
      </div>

      <div
        className="rounded-xl overflow-hidden border border-border/30 shadow-lg"
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        <div className="px-6 py-8 space-y-6 max-w-[320px] mx-auto">
          {/* Logo */}
          {settings.logoUrl && (
            <div className="flex justify-center">
              <img
                src={settings.logoUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            </div>
          )}

          {view === 'form' ? (
            <>
              {/* Text */}
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold leading-tight" style={{ color: settings.textColor }}>
                  {headline || 'Your Headline'}
                </h3>
                {description && (
                  <p className="text-xs opacity-70" style={{ color: settings.textColor }}>
                    {description}
                  </p>
                )}
              </div>

              {/* Form mockup */}
              <div className="space-y-2.5">
                <MockInput label={t.fullNameLabel} textColor={settings.textColor} />
                {settings.showEmail && (
                  <MockInput label={t.emailLabel} textColor={settings.textColor} />
                )}
                {settings.showPhone && (
                  <MockInput label={t.phoneLabel} textColor={settings.textColor} />
                )}
                {settings.customFields?.map((field) => (
                  <MockInput key={field.id} label={field.label || 'Untitled field'} textColor={settings.textColor} />
                ))}
                <div
                  className="h-8 rounded-md flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: settings.brandColor, color: '#FFFFFF' }}
                >
                  {settings.buttonText || t.joinButton}
                </div>
                {settings.termsUrl && (
                  <p className="text-center text-[8px] opacity-40" style={{ color: settings.textColor }}>
                    {t.agreeToTerms} <span className="underline">{t.termsAndPrivacy}</span>
                  </p>
                )}
              </div>

              {/* What You Get */}
              {visibleBenefits.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-center" style={{ color: settings.textColor }}>
                    {t.whatYouGet}
                  </p>
                  <div className="rounded-lg p-2.5 space-y-1.5" style={{ backgroundColor: `${settings.brandColor}08` }}>
                    {visibleBenefits.map((b) => {
                      const Icon = BENEFIT_ICON_MAP[b.icon] ?? Star
                      return (
                        <div key={b.id} className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 shrink-0" style={{ color: settings.brandColor }} />
                          <span className="text-[9px] leading-tight" style={{ color: settings.textColor, opacity: 0.8 }}>
                            {b.text}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tier Progression */}
              {showTiers && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-center" style={{ color: settings.textColor }}>
                    {t.yourCashbackJourney}
                  </p>
                  <div className="relative pl-4">
                    {tiers.map((tier, i) => {
                      const isFirst = i === 0
                      const isLast = i === tiers.length - 1
                      const opacity = 0.4 + (i / (tiers.length - 1)) * 0.6
                      return (
                        <div key={tier.slug} className="relative pb-2.5 last:pb-0">
                          {!isLast && (
                            <div
                              className="absolute left-0 top-2 w-px"
                              style={{
                                backgroundColor: `${settings.brandColor}30`,
                                height: 'calc(100% - 2px)',
                                transform: 'translateX(-1px)',
                              }}
                            />
                          )}
                          <div
                            className="absolute left-0 top-1 h-2 w-2 rounded-full -translate-x-1"
                            style={{ backgroundColor: settings.brandColor, opacity }}
                          />
                          <div className="pl-3">
                            <span className="text-[9px] font-semibold" style={{ color: settings.textColor }}>
                              {tier.name}
                            </span>
                            <span className="text-[9px]" style={{ color: settings.textColor, opacity: 0.7 }}>
                              {' '}— {tier.cashback_rate}%
                            </span>
                            <p className="text-[8px]" style={{ color: settings.textColor, opacity: 0.4 }}>
                              {isFirst
                                ? t.startHere
                                : tier.upgrade_trigger
                                  ? getTriggerDisplayText(tier.upgrade_trigger, currency ?? 'dkk', language)
                                  : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${settings.brandColor}20`, border: `1px solid ${settings.brandColor}40` }}>
                  <svg className="h-6 w-6" style={{ color: settings.brandColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold leading-tight" style={{ color: settings.textColor }}>
                    {settings.successHeading || t.youreIn}
                  </h3>
                  <p className="text-xs opacity-60" style={{ color: settings.textColor }}>
                    {settings.successMessage
                      ? settings.successMessage.replace('{name}', 'Jane')
                      : t.welcomeYourCardReady('Jane')}
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div
                    className="h-8 rounded-md flex items-center justify-center gap-1.5 text-xs font-medium"
                    style={{ backgroundColor: settings.brandColor, color: '#FFFFFF' }}
                  >
                    {t.addToAppleWallet}
                  </div>
                  <p className="text-center text-[8px] underline opacity-40" style={{ color: settings.textColor }}>
                    {t.addToGoogleWallet}
                  </p>
                </div>
              </div>
            </>
          )}

          <p className="text-center text-[7px] opacity-20 pt-2" style={{ color: settings.textColor }}>
            Powered by Loyalink
          </p>
        </div>
      </div>
    </div>
  )
}

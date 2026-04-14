'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrustBar } from '@/components/landing/trust-bar'
import { Gift, Sparkles, CreditCard, Wallet } from 'lucide-react'

function detectPlatform(): 'apple' | 'google' {
  if (typeof navigator === 'undefined') return 'apple'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'google'
  if (/iphone|ipad|ipod/i.test(ua)) return 'apple'
  if (/CrOS/i.test(ua)) return 'google'
  if (/macintosh|mac os/i.test(ua)) return 'apple'
  return 'apple'
}

type Props = {
  customerId: string
  customerAccessToken: string
  customerName: string
  balance: number
  cashbackRate: number
  welcomeBonus: number
  studioName: string
  brandColor: string
  backgroundColor?: string
  textColor?: string
  logoUrl: string | null
  passUrl: string | null
  passPlatform: 'apple' | 'google'
  referrerName: string | null
  memberCount: number
}

export function SuccessHub({
  customerId,
  customerAccessToken,
  customerName,
  cashbackRate,
  welcomeBonus,
  studioName,
  brandColor,
  backgroundColor,
  textColor,
  passUrl,
  passPlatform,
  referrerName,
  memberCount,
}: Props) {
  const [clientPlatform, setClientPlatform] = useState<'apple' | 'google'>(passPlatform)
  const [isDesktop, setIsDesktop] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const detected = detectPlatform()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientPlatform(detected)
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || ''
      setIsDesktop(!(/android|iphone|ipad|ipod/i.test(ua)))
    }
  }, [])

  const accent = brandColor
  const txtStyle = textColor ? { color: textColor } : undefined
  const mutedStyle = textColor
    ? { color: textColor, opacity: 0.6 }
    : { color: 'var(--muted-foreground)' }

  const handlePassDownload = async (targetPlatform: 'apple' | 'google') => {
    if (!passUrl || downloading) return
    setDownloading(true)

    // Track the download
    try {
      await fetch(`/api/loyalty/${customerId}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerAccessToken}`,
        },
        body: JSON.stringify({ event: 'pass_downloaded' }),
      })
    } catch {
      // Non-critical
    }

    // For Google, the stored pass_url may be an intermediate endpoint that
    // returns JSON with the real saveUrl — resolve it before navigating
    if (targetPlatform === 'google') {
      let googleSaveUrl = targetPlatform === passPlatform ? passUrl : null

      // If the URL isn't already a pay.google.com URL, fetch the real one
      if (googleSaveUrl && !googleSaveUrl.includes('pay.google.com')) {
        try {
          const res = await fetch(googleSaveUrl)
          if (res.ok) {
            const data = await res.json()
            if (data.saveUrl) googleSaveUrl = data.saveUrl
          }
        } catch {
          // Fall through to generate below
          googleSaveUrl = null
        }
      }

      // If we don't have a valid URL yet, generate a fresh one
      if (!googleSaveUrl) {
        try {
          const res = await fetch('/api/pass/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${customerAccessToken}`,
            },
            body: JSON.stringify({ customerId, platform: 'google' }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.saveUrl) {
              const PASS_SERVICE = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'
              const url = data.saveUrl.startsWith('http') ? data.saveUrl : `${PASS_SERVICE}${data.saveUrl}`
              // Resolve intermediate endpoint
              if (!url.includes('pay.google.com')) {
                const saveRes = await fetch(url)
                if (saveRes.ok) {
                  const saveData = await saveRes.json()
                  if (saveData.saveUrl) googleSaveUrl = saveData.saveUrl
                }
              } else {
                googleSaveUrl = url
              }
            }
          }
        } catch {
          // Non-critical
        }
      }

      if (googleSaveUrl) window.open(googleSaveUrl, '_blank')
    } else {
      // Apple — use stored URL directly or generate a new one
      if (passPlatform === 'apple' && passUrl) {
        const sep = passUrl.includes('?') ? '&' : '?'
        window.location.href = `${passUrl}${sep}token=${encodeURIComponent(customerAccessToken)}`
      } else {
        try {
          const res = await fetch('/api/pass/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${customerAccessToken}`,
            },
            body: JSON.stringify({ customerId, platform: 'apple' }),
          })
          if (res.ok) {
            const data = await res.json()
            const dl = data.downloadUrl ?? data.passUrl
            if (dl) {
              const PASS_SERVICE = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'
              const url = dl.startsWith('http') ? dl : `${PASS_SERVICE}${dl}`
              const sep = url.includes('?') ? '&' : '?'
              window.location.href = `${url}${sep}token=${encodeURIComponent(customerAccessToken)}`
            }
          }
        } catch {
          // Non-critical
        }
      }
    }

    setDownloading(false)
  }

  // Determine primary and secondary platforms
  const primaryPlatform = clientPlatform
  const secondaryPlatform = clientPlatform === 'apple' ? 'google' : 'apple'

  return (
    <div className="min-h-dvh" style={{ backgroundColor }}>
      <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
        {/* 1. Celebration */}
        <div className="text-center space-y-4 animate-in zoom-in-95 duration-500">
          <div
            className="mx-auto h-20 w-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${accent}20` }}
          >
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h1
              className="text-3xl font-bold"
              style={txtStyle}
            >
              Welcome, {customerName}!
            </h1>
            <p className="text-lg" style={mutedStyle}>
              {studioName} Loyalty Program
            </p>
          </div>
        </div>

        {/* 2. Rewards card */}
        <Card
          className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both"
          style={backgroundColor ? { backgroundColor: `${accent}08`, borderColor: `${accent}25` } : undefined}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                {welcomeBonus > 0 && (
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 shrink-0" style={{ color: accent }} />
                    <span className="text-sm font-medium" style={txtStyle}>
                      {welcomeBonus} kr bonus credited
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" style={{ color: accent }} />
                  <span className="text-sm font-medium" style={txtStyle}>
                    {cashbackRate}% cashback unlocked
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Wallet CTA */}
        {passUrl && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
            <button
              onClick={() => handlePassDownload(primaryPlatform)}
              disabled={downloading}
              className="flex items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-white font-semibold text-base transition-all active:scale-[0.98] hover:brightness-110 w-full disabled:opacity-70"
              style={{ backgroundColor: accent }}
            >
              {primaryPlatform === 'apple' ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.23-.98 2.28-2.08 2.97l3.36 2.61c1.96-1.81 3.09-4.47 3.09-7.63 0-.64-.06-1.25-.17-1.84z" fill="currentColor"/>
                  <path d="M12.17 22c2.79 0 5.13-.92 6.84-2.5l-3.36-2.61c-.92.62-2.1.99-3.48.99-2.68 0-4.95-1.81-5.76-4.24l-3.44 2.66C4.73 19.78 8.17 22 12.17 22z" fill="currentColor"/>
                  <path d="M6.41 13.64c-.21-.62-.33-1.28-.33-1.96s.12-1.35.33-1.96L2.97 7.06C2.06 8.87 1.5 10.87 1.5 13s.56 4.13 1.47 5.94l3.44-2.66z" fill="currentColor"/>
                  <path d="M12.17 5.44c1.51 0 2.87.52 3.94 1.54l2.96-2.96C17.3 2.31 14.96 1.28 12.17 1.28 8.17 1.28 4.73 3.5 2.97 7.06l3.44 2.66c.81-2.43 3.08-4.28 5.76-4.28z" fill="currentColor"/>
                </svg>
              )}
              {downloading ? 'Opening...' : `Add to ${primaryPlatform === 'apple' ? 'Apple' : 'Google'} Wallet`}
            </button>

            {/* Secondary platform link */}
            {(isDesktop || true) && (
              <button
                onClick={() => handlePassDownload(secondaryPlatform)}
                className="block w-full text-center text-xs underline transition-opacity hover:opacity-80"
                style={textColor ? { color: textColor, opacity: 0.5 } : { color: 'var(--muted-foreground)' }}
              >
                Add to {secondaryPlatform === 'apple' ? 'Apple' : 'Google'} Wallet instead
              </button>
            )}
          </div>
        )}

        {/* 4. What's Next */}
        <Card
          className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both"
          style={backgroundColor ? { backgroundColor, borderColor: `${textColor}20` } : undefined}
        >
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold" style={txtStyle}>What&apos;s next</p>
            <div className="space-y-4">
              <Step
                number={1}
                title="Add your loyalty card to your wallet"
                description="Tap the button above to save it"
                accent={accent}
                textColor={textColor}
                icon={Wallet}
              />
              <Step
                number={2}
                title={`Visit ${studioName} and show your card`}
                description="Show it at checkout to earn rewards"
                accent={accent}
                textColor={textColor}
                icon={CreditCard}
              />
              <Step
                number={3}
                title={`Earn ${cashbackRate}% cashback on every purchase`}
                description="Your balance grows automatically"
                accent={accent}
                textColor={textColor}
                icon={Sparkles}
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Trust bar */}
        <div className="animate-in fade-in duration-500 delay-500 fill-mode-both">
          <TrustBar
            signupCount={memberCount}
            brandColor={accent}
            textColor={textColor || 'var(--foreground)'}
          />
        </div>

        {/* 6. Referred by badge */}
        {referrerName && (
          <div className="flex justify-center animate-in fade-in duration-500 delay-500 fill-mode-both">
            <Badge
              variant="secondary"
              className="text-xs px-3 py-1"
              style={textColor ? { color: textColor, opacity: 0.6, backgroundColor: `${accent}10` } : undefined}
            >
              Referred by {referrerName}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

function Step({
  number,
  title,
  description,
  accent,
  textColor,
  icon: Icon,
}: {
  number: number
  title: string
  description: string
  accent: string
  textColor?: string
  icon: typeof Wallet
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="pt-0.5">
        <p className="text-sm font-medium" style={textColor ? { color: textColor } : undefined}>
          <span className="text-muted-foreground mr-1.5" style={textColor ? { color: textColor, opacity: 0.4 } : undefined}>
            {number}.
          </span>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={textColor ? { color: textColor, opacity: 0.5 } : { color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      </div>
    </div>
  )
}

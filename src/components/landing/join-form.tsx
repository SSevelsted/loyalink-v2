'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { formatPhone } from '@/lib/format'
import { getSignupTranslations } from '@/lib/i18n/signup'

const COUNTRY_CODES = [
  { code: '+45', flag: '\u{1F1E9}\u{1F1F0}', country: 'DK' },
  { code: '+46', flag: '\u{1F1F8}\u{1F1EA}', country: 'SE' },
  { code: '+47', flag: '\u{1F1F3}\u{1F1F4}', country: 'NO' },
  { code: '+358', flag: '\u{1F1EB}\u{1F1EE}', country: 'FI' },
  { code: '+49', flag: '\u{1F1E9}\u{1F1EA}', country: 'DE' },
  { code: '+44', flag: '\u{1F1EC}\u{1F1E7}', country: 'GB' },
  { code: '+1', flag: '\u{1F1FA}\u{1F1F8}', country: 'US' },
  { code: '+33', flag: '\u{1F1EB}\u{1F1F7}', country: 'FR' },
  { code: '+34', flag: '\u{1F1EA}\u{1F1F8}', country: 'ES' },
  { code: '+39', flag: '\u{1F1EE}\u{1F1F9}', country: 'IT' },
  { code: '+31', flag: '\u{1F1F3}\u{1F1F1}', country: 'NL' },
  { code: '+43', flag: '\u{1F1E6}\u{1F1F9}', country: 'AT' },
  { code: '+41', flag: '\u{1F1E8}\u{1F1ED}', country: 'CH' },
  { code: '+48', flag: '\u{1F1F5}\u{1F1F1}', country: 'PL' },
  { code: '+351', flag: '\u{1F1F5}\u{1F1F9}', country: 'PT' },
  { code: '+32', flag: '\u{1F1E7}\u{1F1EA}', country: 'BE' },
  { code: '+353', flag: '\u{1F1EE}\u{1F1EA}', country: 'IE' },
  { code: '+354', flag: '\u{1F1EE}\u{1F1F8}', country: 'IS' },
  { code: '+91', flag: '\u{1F1EE}\u{1F1F3}', country: 'IN' },
  { code: '+61', flag: '\u{1F1E6}\u{1F1FA}', country: 'AU' },
]

function detectPlatform(): 'apple' | 'google' {
  if (typeof navigator === 'undefined') return 'apple'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'google'
  if (/iphone|ipad|ipod/i.test(ua)) return 'apple'
  if (/CrOS/i.test(ua)) return 'google'
  if (/macintosh|mac os/i.test(ua)) return 'apple'
  return 'apple'
}

export function JoinForm({
  studioId,
  landingPageId,
  brandColor,
  backgroundColor,
  textColor,
  buttonText,
  showEmail = true,
  showPhone = true,
  referralCode,
  customFields,
  successHeading,
  successMessage,
  termsUrl,
  language,
}: {
  studioId: string
  landingPageId: string
  brandColor?: string
  backgroundColor?: string
  textColor?: string
  buttonText?: string
  showEmail?: boolean
  showPhone?: boolean
  referralCode?: string
  customFields?: { id: string; label: string; type: 'text' | 'select'; required: boolean; options?: string[] }[]
  successHeading?: string
  successMessage?: string
  termsUrl?: string
  language?: string
}) {
  const t = getSignupTranslations(language)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [countryCode, setCountryCode] = useState('+45')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [passUrl, setPassUrl] = useState<string | null>(null)
  const [altPassUrl, setAltPassUrl] = useState<string | null>(null)
  const [altLoading, setAltLoading] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duplicateEmail, setDuplicateEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [platform, setPlatform] = useState<'apple' | 'google'>('apple')
  const [isDesktop, setIsDesktop] = useState(false)
  const [qrPlatform, setQrPlatform] = useState<'apple' | 'google'>('apple')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    setPlatform(detectPlatform())
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || ''
      setIsDesktop(!(/android|iphone|ipad|ipod/i.test(ua)))
    }
  }, [])

  useEffect(() => {
    if (status === 'error') {
      setShake(true)
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [status])

  // Detect light backgrounds to use stronger input borders/fills
  const isLightBg = backgroundColor
    ? (() => {
        const hex = backgroundColor.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        return (r * 299 + g * 587 + b * 114) / 1000 > 160
      })()
    : false

  const inputStyle = textColor
    ? {
        color: textColor,
        borderColor: isLightBg ? `${textColor}40` : `${textColor}30`,
        backgroundColor: isLightBg ? `${textColor}08` : `${textColor}08`,
      }
    : undefined

  const focusRingStyle = brandColor
    ? { '--tw-ring-color': brandColor } as React.CSSProperties
    : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    setDuplicateEmail(null)
    setResendStatus('idle')

    const rawPhone = form.phone.replace(/\s/g, '')
    const fullPhone = rawPhone ? `${countryCode}${rawPhone.replace(/^0+/, '')}` : null

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId,
          landingPageId,
          name: form.name,
          email: form.email,
          phone: fullPhone,
          platform,
          referralCode: referralCode || undefined,
          customFields: Object.keys(customValues).length > 0 ? customValues : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409 && data.error?.includes('email')) {
          setDuplicateEmail(form.email)
          setResendStatus('idle')
        }
        throw new Error(data.error || t.somethingWentWrong)
      }

      // Referral signups → redirect to dedicated success page
      if (referralCode && data.customerId) {
        window.location.href = `/referral-success/${studioId}?customerId=${data.customerId}`
        return
      }

      setStatus('success')
      setQrPlatform(platform)
      if (data.customerId) setCustomerId(data.customerId)
      if (data.customerAccessToken) setAccessToken(data.customerAccessToken)

      if (data.passUrl) {
        setPassUrl(data.passUrl)
        if (platform === 'apple' && !isDesktop) {
          window.location.href = data.passUrl
        }
      } else {
        setPassUrl('failed')
      }

      // Alt-platform pass is generated lazily — see ensureAltPass below.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.somethingWentWrong)
      setStatus('error')
    }
  }

  const ensureAltPass = async (): Promise<string | null> => {
    if (altPassUrl) return altPassUrl
    if (altLoading) return null
    if (!customerId || !accessToken) return null
    setAltLoading(true)
    try {
      const altPlatform = platform === 'apple' ? 'google' : 'apple'
      const altRes = await fetch('/api/pass/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ customerId, platform: altPlatform }),
      })
      if (!altRes.ok) return null
      const altData = await altRes.json()
      const PASS_SERVICE = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'
      if (altPlatform === 'google' && altData.saveUrl) {
        const saveUrl = altData.saveUrl.startsWith('http')
          ? altData.saveUrl
          : `${PASS_SERVICE}${altData.saveUrl}`
        const saveRes = await fetch(saveUrl)
        if (!saveRes.ok) return null
        const saveData = await saveRes.json()
        if (saveData.saveUrl) {
          setAltPassUrl(saveData.saveUrl)
          return saveData.saveUrl as string
        }
      } else if (altPlatform === 'apple' && altData.passUrl) {
        const url = altData.passUrl.startsWith('http')
          ? altData.passUrl
          : `${PASS_SERVICE}${altData.passUrl}`
        setAltPassUrl(url)
        return url
      }
      return null
    } catch {
      return null
    } finally {
      setAltLoading(false)
    }
  }

  const handleResendPass = async () => {
    if (!duplicateEmail) return
    setResendStatus('sending')
    try {
      await fetch('/api/join/resend-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId, email: duplicateEmail }),
      })
      setResendStatus('sent')
    } catch {
      setResendStatus('idle')
    }
  }

  if (status === 'success') {
    const accent = brandColor || '#7C3AED'
    return (
      <Card
        className="animate-in zoom-in-95 duration-300"
        style={backgroundColor ? { backgroundColor, borderColor: `${textColor}20` } : undefined}
      >
        <CardContent className="py-10 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
            <svg className="h-8 w-8" style={{ color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold font-display" style={textColor ? { color: textColor } : undefined}>
              {successHeading || t.youreIn}
            </h2>
            <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: 'var(--muted-foreground)' }}>
              {successMessage
                ? successMessage.replace('{name}', form.name)
                : t.welcomeYourCardReady(form.name)}
            </p>
          </div>
          <div className="space-y-3 pt-2">
            {passUrl === 'failed' ? (
              isDesktop && customerId && accessToken ? (
                // Desktop fallback: QR code that auto-adds pass on phone
                <div className="space-y-4">
                  <p className="text-sm font-medium" style={textColor ? { color: textColor, opacity: 0.8 } : { color: 'var(--foreground)' }}>
                    {t.scanWithPhone}
                  </p>
                  <div className="flex justify-center">
                    <div className="rounded-2xl bg-white p-4 shadow-md inline-block">
                      <QRCodeSVG
                        value={`${window.location.origin}/loyalty/${customerId}?addPass=1&token=${accessToken}`}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                  </div>
                  <p className="text-xs" style={textColor ? { color: textColor, opacity: 0.4 } : { color: 'var(--muted-foreground)' }}>
                    {t.pointCameraAtQR}
                  </p>
                </div>
              ) : (
                <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.5 } : { color: 'var(--muted-foreground)' }}>
                  {t.cardWillBeSent}
                </p>
              )
            ) : passUrl ? (
              isDesktop ? (
                // Desktop: QR code with platform picker
                <div className="space-y-4">
                  <p className="text-sm font-medium" style={textColor ? { color: textColor, opacity: 0.8 } : { color: 'var(--foreground)' }}>
                    {t.scanWithPhone}
                  </p>

                  {/* Platform toggle — alt URL is fetched on demand */}
                  <div className="flex justify-center">
                    <div className="inline-flex rounded-full p-1 gap-1" style={{ backgroundColor: `${textColor || '#000'}15` }}>
                      {(['apple', 'google'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setQrPlatform(p)
                              if (p !== platform) ensureAltPass()
                            }}
                            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all"
                            style={qrPlatform === p
                              ? { backgroundColor: accent, color: '#fff' }
                              : { color: textColor || undefined, opacity: 0.5 }
                            }
                          >
                            {p === 'apple' ? (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.23-.98 2.28-2.08 2.97l3.36 2.61c1.96-1.81 3.09-4.47 3.09-7.63 0-.64-.06-1.25-.17-1.84z"/>
                                <path d="M12.17 22c2.79 0 5.13-.92 6.84-2.5l-3.36-2.61c-.92.62-2.1.99-3.48.99-2.68 0-4.95-1.81-5.76-4.24l-3.44 2.66C4.73 19.78 8.17 22 12.17 22z"/>
                                <path d="M6.41 13.64c-.21-.62-.33-1.28-.33-1.96s.12-1.35.33-1.96L2.97 7.06C2.06 8.87 1.5 10.87 1.5 13s.56 4.13 1.47 5.94l3.44-2.66z"/>
                                <path d="M12.17 5.44c1.51 0 2.87.52 3.94 1.54l2.96-2.96C17.3 2.31 14.96 1.28 12.17 1.28 8.17 1.28 4.73 3.5 2.97 7.06l3.44 2.66c.81-2.43 3.08-4.28 5.76-4.28z"/>
                              </svg>
                            )}
                            {p === 'apple' ? 'Apple' : 'Google'}
                          </button>
                        ))}
                      </div>
                    </div>

                  <div className="flex justify-center">
                    <div className="rounded-2xl bg-white p-4 shadow-md inline-block">
                      <QRCodeSVG
                        value={(qrPlatform === platform ? passUrl : altPassUrl) ?? passUrl}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                  </div>

                  <p className="text-xs" style={textColor ? { color: textColor, opacity: 0.4 } : { color: 'var(--muted-foreground)' }}>
                    {t.pointCameraAtQR}
                  </p>
                </div>
              ) : (
                // Mobile: direct wallet buttons
                <div className="space-y-3">
                  {platform === 'apple' && (
                    <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: 'var(--muted-foreground)' }}>
                      {t.cantSeeYourPass}
                    </p>
                  )}
                  {platform === 'apple' ? (
                    <a
                      href={passUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-white font-semibold text-sm transition-all active:scale-[0.98] hover:brightness-110 w-full"
                      style={{ backgroundColor: accent }}
                    >
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                      {t.addToAppleWallet}
                    </a>
                  ) : (
                    <a
                      href={passUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-white font-semibold text-sm transition-all active:scale-[0.98] hover:brightness-110 w-full"
                      style={{ backgroundColor: accent }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.23-.98 2.28-2.08 2.97l3.36 2.61c1.96-1.81 3.09-4.47 3.09-7.63 0-.64-.06-1.25-.17-1.84z" fill="currentColor"/>
                        <path d="M12.17 22c2.79 0 5.13-.92 6.84-2.5l-3.36-2.61c-.92.62-2.1.99-3.48.99-2.68 0-4.95-1.81-5.76-4.24l-3.44 2.66C4.73 19.78 8.17 22 12.17 22z" fill="currentColor"/>
                        <path d="M6.41 13.64c-.21-.62-.33-1.28-.33-1.96s.12-1.35.33-1.96L2.97 7.06C2.06 8.87 1.5 10.87 1.5 13s.56 4.13 1.47 5.94l3.44-2.66z" fill="currentColor"/>
                        <path d="M12.17 5.44c1.51 0 2.87.52 3.94 1.54l2.96-2.96C17.3 2.31 14.96 1.28 12.17 1.28 8.17 1.28 4.73 3.5 2.97 7.06l3.44 2.66c.81-2.43 3.08-4.28 5.76-4.28z" fill="currentColor"/>
                      </svg>
                      {t.addToGoogleWallet}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const url = altPassUrl ?? (await ensureAltPass())
                      if (!url) return
                      if (platform === 'apple') {
                        window.open(url, '_blank', 'noopener,noreferrer')
                      } else {
                        window.location.href = url
                      }
                    }}
                    disabled={altLoading}
                    className="block w-full text-center text-xs underline transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={textColor ? { color: textColor, opacity: 0.5 } : { color: 'var(--muted-foreground)' }}
                  >
                    {altLoading ? '…' : (platform === 'apple' ? t.addToGoogleWallet : t.addToAppleWallet)}
                  </button>
                </div>
              )
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0]

  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={backgroundColor ? { backgroundColor, borderColor: `${textColor}20` } : undefined}
    >
      <CardContent className="py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
            <Label htmlFor="name" style={textColor ? { color: textColor } : undefined}>{t.fullNameLabel}</Label>
            <Input
              id="name"
              placeholder={t.fullNamePlaceholder}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
              required
              className="transition-all duration-200"
              style={{ ...inputStyle, ...focusRingStyle }}
            />
          </div>
          {showEmail && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
              <Label htmlFor="email" style={textColor ? { color: textColor } : undefined}>{t.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.emailPlaceholder}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                required
                className="transition-all duration-200"
                style={{ ...inputStyle, ...focusRingStyle }}
              />
            </div>
          )}
          {showPhone && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both">
              <Label htmlFor="phone" style={textColor ? { color: textColor } : undefined}>{t.phoneLabel}</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger
                    className="w-[100px] shrink-0 transition-all duration-200"
                    style={{ ...inputStyle, ...focusRingStyle }}
                  >
                    <SelectValue>
                      {selectedCountry.flag} {selectedCountry.code}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder={t.phonePlaceholder}
                  value={form.phone}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d\s]/g, '')
                    setForm({ ...form, phone: formatPhone(raw) })
                  }}
                  autoComplete="tel-national"
                  required
                  className="flex-1 transition-all duration-200"
                  style={{ ...inputStyle, ...focusRingStyle }}
                />
              </div>
            </div>
          )}
          {customFields?.map((field) => (
            <div key={field.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both">
              <Label htmlFor={field.id} style={textColor ? { color: textColor } : undefined}>{field.label}</Label>
              {field.type === 'select' ? (
                <Select
                  value={customValues[field.id] ?? ''}
                  onValueChange={(val) => setCustomValues((prev) => ({ ...prev, [field.id]: val }))}
                >
                  <SelectTrigger
                    className="transition-all duration-200"
                    style={{ ...inputStyle, ...focusRingStyle }}
                  >
                    <SelectValue placeholder={t.selectPlaceholder(field.label)} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.filter(Boolean).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.id}
                  value={customValues[field.id] ?? ''}
                  onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  required={field.required}
                  className="transition-all duration-200"
                  style={{ ...inputStyle, ...focusRingStyle }}
                />
              )}
            </div>
          ))}
          {error && (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm text-destructive ${shake ? 'animate-shake' : ''}`}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
              {duplicateEmail && resendStatus === 'sent' ? (
                <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: 'var(--muted-foreground)' }}>
                  {t.sentLinkCheckEmail}
                </p>
              ) : duplicateEmail ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resendStatus === 'sending'}
                  onClick={handleResendPass}
                  className="w-full"
                >
                  {resendStatus === 'sending' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {t.sendMeLink}
                </Button>
              ) : null}
            </div>
          )}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-12 text-base rounded-xl"
              disabled={
                status === 'loading' ||
                !form.name ||
                (showEmail && !form.email) ||
                (showPhone && !form.phone) ||
                (customFields?.some((f) => f.required && !customValues[f.id]) ?? false)
              }
              style={brandColor ? { backgroundColor: brandColor, color: '#FFFFFF' } : undefined}
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t.signingUp}
                </span>
              ) : (buttonText || t.joinButton)}
            </Button>
            {termsUrl && (
              <p className="text-center text-[11px] pt-1.5" style={textColor ? { color: textColor, opacity: 0.4 } : { color: 'var(--muted-foreground)' }}>
                {t.agreeToTerms}{' '}
                <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                  {t.termsAndPrivacy}
                </a>
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

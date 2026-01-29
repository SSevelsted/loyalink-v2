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
  // Android devices get Google Wallet
  if (/android/i.test(ua)) return 'google'
  // Everything else (iOS, iPadOS, macOS) gets Apple Wallet
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
}: {
  studioId: string
  landingPageId: string
  brandColor?: string
  backgroundColor?: string
  textColor?: string
  buttonText?: string
  showEmail?: boolean
  showPhone?: boolean
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [countryCode, setCountryCode] = useState('+45')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [passUrl, setPassUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<'apple' | 'google'>('apple')

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  const inputStyle = textColor
    ? { color: textColor, borderColor: `${textColor}30`, backgroundColor: `${textColor}08` }
    : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError(null)

    const fullPhone = form.phone ? `${countryCode}${form.phone.replace(/^0+/, '')}` : null

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId,
          landingPageId,
          name: form.name,
          email: form.email || null,
          phone: fullPhone,
          platform,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setStatus('success')

      if (data.passUrl) {
        setPassUrl(data.passUrl)
        // On Apple devices, redirect directly to the .pkpass URL
        // Safari will automatically show the "Add to Wallet" prompt
        if (platform === 'apple') {
          window.location.href = data.passUrl
        }
      } else {
        setPassUrl('failed')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <Card style={backgroundColor ? { backgroundColor, borderColor: `${textColor}20` } : undefined}>
        <CardContent className="py-10 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold" style={textColor ? { color: textColor } : undefined}>
              You&apos;re in!
            </h2>
            <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: 'var(--muted-foreground)' }}>
              Welcome, {form.name}. Your loyalty card is ready.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            {passUrl === 'failed' ? (
              <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.5 } : { color: 'var(--muted-foreground)' }}>
                Your card will be sent to you shortly.
              </p>
            ) : passUrl ? (
              <>
                {platform === 'apple' ? (
                  <>
                    <p className="text-sm" style={textColor ? { color: textColor, opacity: 0.6 } : { color: 'var(--muted-foreground)' }}>
                      Can&apos;t see your pass? Tap below to add it again
                    </p>
                    <a
                      href={passUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-white font-semibold text-sm transition-transform active:scale-[0.98]"
                      style={{ backgroundColor: '#000000' }}
                    >
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                      Add to Apple Wallet
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href={passUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-white font-semibold text-sm transition-transform active:scale-[0.98]"
                      style={{ backgroundColor: '#4285F4' }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.23-.98 2.28-2.08 2.97l3.36 2.61c1.96-1.81 3.09-4.47 3.09-7.63 0-.64-.06-1.25-.17-1.84z" fill="#4285F4"/>
                        <path d="M12.17 22c2.79 0 5.13-.92 6.84-2.5l-3.36-2.61c-.92.62-2.1.99-3.48.99-2.68 0-4.95-1.81-5.76-4.24l-3.44 2.66C4.73 19.78 8.17 22 12.17 22z" fill="#34A853"/>
                        <path d="M6.41 13.64c-.21-.62-.33-1.28-.33-1.96s.12-1.35.33-1.96L2.97 7.06C2.06 8.87 1.5 10.87 1.5 13s.56 4.13 1.47 5.94l3.44-2.66z" fill="#FBBC05"/>
                        <path d="M12.17 5.44c1.51 0 2.87.52 3.94 1.54l2.96-2.96C17.3 2.31 14.96 1.28 12.17 1.28 8.17 1.28 4.73 3.5 2.97 7.06l3.44 2.66c.81-2.43 3.08-4.28 5.76-4.28z" fill="#EA4335"/>
                      </svg>
                      Add to Google Wallet
                    </a>
                  </>
                )}
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0]

  return (
    <Card style={backgroundColor ? { backgroundColor, borderColor: `${textColor}20` } : undefined}>
      <CardContent className="py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" style={textColor ? { color: textColor } : undefined}>Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          {showEmail && (
            <div className="space-y-2">
              <Label htmlFor="email" style={textColor ? { color: textColor } : undefined}>Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>
          )}
          {showPhone && (
            <div className="space-y-2">
              <Label htmlFor="phone" style={textColor ? { color: textColor } : undefined}>Phone</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger
                    className="w-[100px] shrink-0"
                    style={inputStyle}
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
                  placeholder="12 34 56 78"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="flex-1"
                  style={inputStyle}
                />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={status === 'loading' || !form.name}
            style={brandColor ? { backgroundColor: brandColor, color: '#FFFFFF' } : undefined}
          >
            {status === 'loading' ? 'Signing up...' : (buttonText || 'Join & Get Your Pass')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

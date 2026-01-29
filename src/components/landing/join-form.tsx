'use client'

import { useState } from 'react'
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
  { code: '+45', flag: '🇩🇰', country: 'DK' },
  { code: '+46', flag: '🇸🇪', country: 'SE' },
  { code: '+47', flag: '🇳🇴', country: 'NO' },
  { code: '+358', flag: '🇫🇮', country: 'FI' },
  { code: '+49', flag: '🇩🇪', country: 'DE' },
  { code: '+44', flag: '🇬🇧', country: 'GB' },
  { code: '+1', flag: '🇺🇸', country: 'US' },
  { code: '+33', flag: '🇫🇷', country: 'FR' },
  { code: '+34', flag: '🇪🇸', country: 'ES' },
  { code: '+39', flag: '🇮🇹', country: 'IT' },
  { code: '+31', flag: '🇳🇱', country: 'NL' },
  { code: '+43', flag: '🇦🇹', country: 'AT' },
  { code: '+41', flag: '🇨🇭', country: 'CH' },
  { code: '+48', flag: '🇵🇱', country: 'PL' },
  { code: '+351', flag: '🇵🇹', country: 'PT' },
  { code: '+32', flag: '🇧🇪', country: 'BE' },
  { code: '+353', flag: '🇮🇪', country: 'IE' },
  { code: '+354', flag: '🇮🇸', country: 'IS' },
  { code: '+91', flag: '🇮🇳', country: 'IN' },
  { code: '+61', flag: '🇦🇺', country: 'AU' },
]

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
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setStatus('success')

      if (data.passUrl) {
        setPassUrl(data.passUrl)
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
                <a
                  href={passUrl}
                  className="flex items-center justify-center gap-3 w-full rounded-xl px-6 py-4 text-white font-semibold text-base transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: brandColor || '#000000' }}
                >
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Add to Apple Wallet
                </a>
                <p className="text-xs" style={textColor ? { color: textColor, opacity: 0.4 } : { color: 'var(--muted-foreground)' }}>
                  Tap the button to download your digital loyalty card
                </p>
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

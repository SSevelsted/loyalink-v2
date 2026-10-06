'use client'

import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Loader2, Share2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPhone } from '@/lib/format'
import type { GiftTranslations } from '@/lib/i18n/gift'
import { COUNTRY_CODES, countryCodeFor, toE164 } from '@/lib/phone-country-codes'
import { SEND_GIFT_DAILY_LIMIT } from '@/lib/send-gift'

type View = 'choose' | 'form' | 'sent'

/**
 * "Send a gift" in the private member page: the member enters a friend's
 * first name + phone (the studio's platform messages the friend), or shares
 * the link. The form posts to /api/loyalty/[memberId]/send-gift with the
 * page's own token; Loyalink creates no member for the friend.
 */
export function SendGiftSheet({
  open,
  onOpenChange,
  memberId,
  token,
  studioName,
  defaultCountry,
  brandColor,
  onShare,
  g,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  token: string
  studioName: string
  defaultCountry: string | null
  brandColor: string
  /** null when the member has no referral link yet. */
  onShare: (() => void) | null
  g: GiftTranslations
}) {
  const [view, setView] = useState<View>('choose')
  const [firstName, setFirstName] = useState('')
  const [countryCode, setCountryCode] = useState(countryCodeFor(defaultCountry))
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSent, setLastSent] = useState<string | null>(null)
  const [sentNames, setSentNames] = useState<string[]>([])

  const selected = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0]

  const reset = (next: View) => {
    setFirstName('')
    setPhone('')
    setError(null)
    setView(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/loyalty/${encodeURIComponent(memberId)}/send-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName: firstName.trim(), phone: toE164(countryCode, phone) }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(
          data.error === 'self' ? g.errSelf
            : data.error === 'invalid_phone' ? g.errPhone
            : data.error === 'daily_limit' ? g.errLimit(SEND_GIFT_DAILY_LIMIT)
            : data.error === 'no_webhook' || data.error === 'referrals_disabled' ? g.errUnavailable
            : g.errFailed,
        )
        return
      }
      const name = firstName.trim()
      setLastSent(name)
      setSentNames((names) => [...names, name])
      setView('sent')
    } catch {
      setError(g.errFailed)
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset('choose')
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8" showCloseButton={false}>
        <SheetHeader className="pb-0 text-center">
          <SheetTitle className="text-lg">{g.sendAGift}</SheetTitle>
        </SheetHeader>

        <div className="px-4">
          {view === 'choose' && (
            <div className="space-y-3">
              <OptionButton icon={UserPlus} label={g.sendOptionFriend} brandColor={brandColor} onClick={() => reset('form')} />
              {onShare && (
                <OptionButton
                  icon={Share2}
                  label={g.sendOptionShare}
                  brandColor={brandColor}
                  onClick={() => {
                    onShare()
                    onOpenChange(false)
                  }}
                />
              )}
              <p className="pt-2 text-center text-xs text-muted-foreground">{g.orShowCard}</p>
            </div>
          )}

          {view === 'form' && (
            <form onSubmit={submit} className="space-y-5">
              <button
                type="button"
                onClick={() => reset('choose')}
                className="-ml-1 flex items-center gap-1 text-sm text-muted-foreground hover:opacity-80"
              >
                <ChevronLeft className="h-4 w-4" />
                {g.back}
              </button>
              <div className="space-y-2">
                <Label htmlFor="friend-first-name">{g.friendFirstName}</Label>
                <Input
                  id="friend-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={g.friendFirstNamePlaceholder}
                  autoComplete="off"
                  maxLength={60}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friend-phone">{g.friendPhone}</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[100px] shrink-0">
                      <SelectValue>{selected.flag} {selected.code}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} ({c.country})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="friend-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value.replace(/[^\d\s]/g, '')))}
                    placeholder="12 34 56 78"
                    autoComplete="off"
                    required
                    className="flex-1"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={sending || !firstName.trim() || !phone.trim()}
                className="h-12 w-full rounded-xl text-base font-semibold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : g.sendTheGift}
              </Button>
            </form>
          )}

          {view === 'sent' && lastSent && (
            <div className="space-y-5 pt-2 text-center">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: `${brandColor}24` }}
              >
                <Check className="h-7 w-7" style={{ color: brandColor }} strokeWidth={2.5} />
              </div>
              <p className="text-base font-medium text-balance">{g.friendSent(studioName, lastSent)}</p>
              {sentNames.length > 1 && (
                <p className="text-xs text-muted-foreground">{g.sentToday(sentNames.join(', '))}</p>
              )}
              <Button
                type="button"
                onClick={() => reset('form')}
                className="h-12 w-full rounded-xl text-base font-semibold text-white"
                style={{ backgroundColor: brandColor }}
              >
                <UserPlus className="h-5 w-5" />
                {g.sendAnother}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function OptionButton({
  icon: Icon,
  label,
  brandColor,
  onClick,
}: {
  icon: typeof UserPlus
  label: string
  brandColor: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-4 text-left transition-colors hover:bg-secondary/60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${brandColor}24` }}>
        <Icon className="h-5 w-5" style={{ color: brandColor }} />
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

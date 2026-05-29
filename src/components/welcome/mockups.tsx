'use client'

import { QrCode, ScanLine, Sparkles, Wallet, X } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg'

const SIZE: Record<
  Size,
  {
    width: string
    statusText: string
    titleText: string
    bodyText: string
    tinyText: string
    cardRadius: string
    bezelRadius: string
    screenRadius: string
    sidePad: string
  }
> = {
  sm: {
    width: 'w-[148px]',
    statusText: 'text-[7px]',
    titleText: 'text-[9px]',
    bodyText: 'text-[7.5px]',
    tinyText: 'text-[6px]',
    cardRadius: 'rounded-xl',
    bezelRadius: 'rounded-[1.85rem]',
    screenRadius: 'rounded-[1.55rem]',
    sidePad: 'px-2',
  },
  md: {
    width: 'w-[192px]',
    statusText: 'text-[9px]',
    titleText: 'text-[11px]',
    bodyText: 'text-[9px]',
    tinyText: 'text-[7px]',
    cardRadius: 'rounded-[14px]',
    bezelRadius: 'rounded-[2.25rem]',
    screenRadius: 'rounded-[1.95rem]',
    sidePad: 'px-2.5',
  },
  lg: {
    width: 'w-[240px]',
    statusText: 'text-[10px]',
    titleText: 'text-sm',
    bodyText: 'text-[10px]',
    tinyText: 'text-[8px]',
    cardRadius: 'rounded-2xl',
    bezelRadius: 'rounded-[2.5rem]',
    screenRadius: 'rounded-[2.15rem]',
    sidePad: 'px-3',
  },
}

const ACCENT_DEFAULT = '#ff6a3d'
const DEFAULT_STRIP = '/images/default-strip.png'

// The studio's real wallet card, derived from their pass template + rewards
// config. Everything here mirrors what actually lands in the customer's wallet:
// real tier colors, real logo, real strip image, real field labels (in the
// studio's language) and the real base cashback rate.
export type PassMock = {
  studioName: string
  backgroundColor: string
  foregroundColor: string
  labelColor: string
  logoUrl: string | null
  stripUrl: string | null
  memberLabel: string
  memberValue: string
  balanceLabel: string
  cashbackLabel: string
  cashbackValue: string
  /** Brand accent — used for the "cashback earned" notification + scanner. */
  accent: string
}

export type LandingMock = {
  studioName: string
  brandColor: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  headline: string
  buttonText: string
  benefits: string[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Phone frame — modern iPhone-style with dynamic island, subtle bezel,
// realistic drop shadow, and a polished inner screen.
// ──────────────────────────────────────────────────────────────────────────────

export function PhoneFrame({
  children,
  size = 'md',
  screenClassName = '',
  screenStyle,
  className = '',
}: {
  children: React.ReactNode
  size?: Size
  screenClassName?: string
  screenStyle?: React.CSSProperties
  className?: string
}) {
  const s = SIZE[size]
  return (
    <div
      className={`relative ${s.width} aspect-[9/19.5] ${s.bezelRadius} p-[3px] bg-gradient-to-b from-zinc-700 via-zinc-900 to-black shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55),0_8px_24px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/40 ${className}`}
    >
      <div
        className={`relative h-full w-full ${s.screenRadius} overflow-hidden bg-black ${screenClassName}`}
        style={screenStyle}
      >
        <StatusBar size={size} />
        <DynamicIsland size={size} />
        <div className="relative h-full w-full">{children}</div>
      </div>
      {/* Soft top highlight to suggest curved glass */}
      <div
        className={`pointer-events-none absolute inset-0 ${s.bezelRadius}`}
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)',
        }}
      />
    </div>
  )
}

function DynamicIsland({ size }: { size: Size }) {
  const w = size === 'sm' ? 'w-12' : size === 'md' ? 'w-16' : 'w-20'
  const h = size === 'sm' ? 'h-3' : size === 'md' ? 'h-3.5' : 'h-4'
  const top = size === 'sm' ? 'top-1.5' : 'top-2'
  return (
    <div
      className={`absolute ${top} left-1/2 -translate-x-1/2 ${w} ${h} rounded-full bg-black z-30 ring-[0.5px] ring-white/5`}
    />
  )
}

function StatusBar({ size, dark = false }: { size: Size; dark?: boolean }) {
  const s = SIZE[size]
  const pt = size === 'sm' ? 'pt-1' : 'pt-1.5'
  const color = dark ? 'text-black/70' : 'text-white/70'
  return (
    <div
      className={`absolute inset-x-0 top-0 ${pt} ${s.sidePad} flex items-center justify-between ${color} ${s.statusText} z-20 pointer-events-none`}
    >
      <span className="font-semibold tracking-tight tabular-nums">9:41</span>
      <div className="flex items-center gap-[3px]">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  )
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 16 12" className="h-2 w-2.5" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="2.5" height="4" rx="0.5" />
      <rect x="3.5" y="6" width="2.5" height="6" rx="0.5" />
      <rect x="7" y="3.5" width="2.5" height="8.5" rx="0.5" />
      <rect x="10.5" y="0.5" width="2.5" height="11.5" rx="0.5" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" className="h-2 w-2.5" fill="currentColor" aria-hidden="true">
      <path d="M8 9.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm0-3.4c1 0 1.95.36 2.7 1l-.8 1a2.8 2.8 0 0 0-3.8 0l-.8-1A4.1 4.1 0 0 1 8 6.1Zm0-3a7 7 0 0 1 5 2.05l-.85 1A5.6 5.6 0 0 0 8 4.5a5.6 5.6 0 0 0-4.15 1.65l-.85-1A7 7 0 0 1 8 3.1Z" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg viewBox="0 0 22 10" className="h-2 w-3.5" aria-hidden="true">
      <rect x="0.5" y="0.5" width="18" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.7" />
      <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
      <rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

function ScreenContent({
  children,
  className = '',
  size,
}: {
  children: React.ReactNode
  className?: string
  size: Size
}) {
  const pt = size === 'sm' ? 'pt-7' : 'pt-8'
  return <div className={`absolute inset-x-0 top-0 bottom-0 ${pt} ${className}`}>{children}</div>
}

// ──────────────────────────────────────────────────────────────────────────────
// Landing page — the customer-facing signup screen, using the studio's real
// brand colour, logo, headline and button text.
// ──────────────────────────────────────────────────────────────────────────────

export function LandingPageMockup({
  size = 'md',
  landing,
}: {
  size?: Size
  landing: LandingMock
}) {
  const s = SIZE[size]
  const fieldH = size === 'sm' ? 'h-3' : size === 'md' ? 'h-4' : 'h-5'
  const logoSize = size === 'sm' ? 28 : size === 'md' ? 36 : 44
  const initial = landing.studioName?.trim().charAt(0).toUpperCase() ?? 'S'
  const bg = landing.backgroundColor || '#0b0b0d'
  const fg = landing.textColor || '#ffffff'
  const accent = landing.brandColor || ACCENT_DEFAULT

  return (
    <PhoneFrame
      size={size}
      screenStyle={{
        background: `radial-gradient(120% 80% at 50% 0%, ${hexToRgba(fg, 0.04)}, transparent 60%), ${bg}`,
      }}
    >
      <ScreenContent size={size}>
        <div className={`flex flex-col items-center gap-2 ${s.sidePad}`}>
          {/* Studio logo */}
          {landing.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={landing.logoUrl}
              alt=""
              className="object-contain"
              style={{ height: logoSize, maxWidth: logoSize * 2.6 }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center font-semibold shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              style={{
                width: logoSize,
                height: logoSize,
                background: `linear-gradient(135deg, ${accent}, ${darken(accent, 0.35)})`,
                color: '#fff',
                fontSize: logoSize * 0.42,
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
              }}
            >
              {initial}
            </div>
          )}

          {/* Headline */}
          <div className="text-center space-y-0.5">
            <p
              className={`${s.titleText} font-bold leading-tight tracking-tight`}
              style={{ color: fg }}
            >
              {landing.headline}
            </p>
            <p className={`${s.tinyText} leading-tight`} style={{ color: hexToRgba(fg, 0.55) }}>
              Cashback on every tattoo
            </p>
          </div>

          {/* Form stubs */}
          <div className="w-full space-y-1.5 mt-1">
            <FieldStub h={fieldH} label="Name" tinyText={s.tinyText} fg={fg} />
            <FieldStub h={fieldH} label="Email" tinyText={s.tinyText} fg={fg} />
            <FieldStub h={fieldH} label="Phone" tinyText={s.tinyText} fg={fg} />
          </div>

          {/* CTA */}
          <div
            className={`mt-1.5 w-full ${fieldH} ${s.cardRadius} flex items-center justify-center font-semibold tracking-tight shadow-[0_8px_20px_-6px_rgba(0,0,0,0.4)] ${s.bodyText} truncate px-1`}
            style={{ backgroundColor: accent, color: readableText(accent) }}
          >
            {landing.buttonText}
          </div>

          <p className={`${s.tinyText} text-center mt-1`} style={{ color: hexToRgba(fg, 0.35) }}>
            Free · 30 seconds · No app needed
          </p>
        </div>
      </ScreenContent>
    </PhoneFrame>
  )
}

function FieldStub({ h, label, tinyText, fg }: { h: string; label: string; tinyText: string; fg: string }) {
  return (
    <div className="space-y-0.5">
      <p className={`${tinyText} leading-none`} style={{ color: hexToRgba(fg, 0.35) }}>
        {label}
      </p>
      <div
        className={`${h} w-full rounded-md`}
        style={{ backgroundColor: hexToRgba(fg, 0.05), boxShadow: `inset 0 0 0 1px ${hexToRgba(fg, 0.08)}` }}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Wallet pass — the studio's REAL Apple Wallet store card, shown the way it
// appears in the Wallet app: black background, single pass, carousel dots.
// Mirrors src/components/wallet/card-preview.tsx field-for-field.
// ──────────────────────────────────────────────────────────────────────────────

export function WalletPassMockup({
  size = 'md',
  pass,
  balanceValue,
  showCashbackBurst = false,
  earnedValue,
}: {
  size?: Size
  pass: PassMock
  /** Formatted balance string, e.g. "0 kr". */
  balanceValue: string
  showCashbackBurst?: boolean
  /** Formatted "+earned" string for the notification, e.g. "+50 kr". */
  earnedValue?: string
}) {
  const s = SIZE[size]
  const { backgroundColor, foregroundColor, labelColor, logoUrl, stripUrl, studioName } = pass
  const stripH = size === 'sm' ? 46 : size === 'md' ? 60 : 76
  const qrSize = size === 'sm' ? 50 : size === 'md' ? 66 : 84
  const labelText = size === 'sm' ? 'text-[5px]' : 'text-[6px]'

  return (
    <PhoneFrame size={size} screenStyle={{ background: '#000' }}>
      {/* Cashback earned notification (overlays the wallet) */}
      {showCashbackBurst && (
        <CashbackNotification size={size} accent={pass.accent} earnedValue={earnedValue} />
      )}

      <ScreenContent size={size} className="pt-9">
        <div className={`${s.sidePad}`}>
          {/* The real store card */}
          <div
            className={`relative ${s.cardRadius} overflow-hidden shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]`}
            style={{ backgroundColor }}
          >
            {/* Header: logo / name + balance */}
            <div className={`flex items-start justify-between ${size === 'sm' ? 'px-2 pt-2 pb-1' : 'px-2.5 pt-2.5 pb-1.5'}`}>
              <div className="min-w-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="object-contain" style={{ height: size === 'sm' ? 14 : 18, maxWidth: size === 'sm' ? 70 : 96 }} />
                ) : (
                  <span
                    className={`${s.bodyText} font-bold italic truncate block`}
                    style={{ color: foregroundColor, fontFamily: 'var(--font-display)' }}
                  >
                    {studioName}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0 ml-1.5">
                <p className={`${labelText} uppercase tracking-wider leading-none font-semibold`} style={{ color: labelColor }}>
                  {pass.balanceLabel}
                </p>
                <p className={`${s.bodyText} font-bold leading-tight tabular-nums mt-0.5`} style={{ color: foregroundColor }}>
                  {balanceValue}
                </p>
              </div>
            </div>

            {/* Strip image — the studio's banner artwork */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stripUrl || DEFAULT_STRIP}
              alt=""
              className="w-full object-cover"
              style={{ height: stripH }}
            />

            {/* Bottom fields: member + cashback */}
            <div className={`flex items-start justify-between ${size === 'sm' ? 'px-2 py-1.5' : 'px-2.5 py-2'}`}>
              <div className="min-w-0">
                <p className={`${labelText} uppercase tracking-wider leading-none font-semibold`} style={{ color: labelColor }}>
                  {pass.memberLabel}
                </p>
                <p className={`${s.tinyText} font-semibold leading-tight mt-0.5 truncate`} style={{ color: foregroundColor }}>
                  {pass.memberValue}
                </p>
              </div>
              <div className="text-right shrink-0 ml-1.5">
                <p className={`${labelText} uppercase tracking-wider leading-none font-semibold`} style={{ color: labelColor }}>
                  {pass.cashbackLabel}
                </p>
                <p className={`${s.tinyText} font-semibold leading-tight mt-0.5 tabular-nums`} style={{ color: foregroundColor }}>
                  {pass.cashbackValue}
                </p>
              </div>
            </div>

            {/* QR code */}
            <div className="flex items-center justify-center pb-2 pt-0.5">
              <div className="bg-white rounded-md p-1">
                <RealisticQR px={qrSize} />
              </div>
            </div>
          </div>

          {/* Wallet carousel dots */}
          <div className="flex items-center justify-center gap-1 mt-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: i === 1 ? 4 : 3,
                  height: i === 1 ? 4 : 3,
                  backgroundColor: i === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        </div>
      </ScreenContent>
    </PhoneFrame>
  )
}

function CashbackNotification({ size, accent, earnedValue }: { size: Size; accent: string; earnedValue?: string }) {
  const s = SIZE[size]
  const topPos = size === 'sm' ? 24 : 30
  return (
    <div className="absolute inset-x-1.5 z-30 animate-celebrate" style={{ top: topPos }} aria-hidden="true">
      <div
        className={`flex items-center gap-1.5 ${s.cardRadius} px-1.5 py-1 backdrop-blur-md ring-1 ring-inset ring-white/15 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.55)]`}
        style={{ backgroundColor: 'rgba(28,28,30,0.92)' }}
      >
        <div
          className="rounded-[6px] flex items-center justify-center shrink-0"
          style={{
            width: size === 'sm' ? 14 : 18,
            height: size === 'sm' ? 14 : 18,
            background: `linear-gradient(135deg, ${accent}, ${darken(accent, 0.35)})`,
          }}
        >
          <Sparkles className="text-white" style={{ width: size === 'sm' ? 7 : 9, height: size === 'sm' ? 7 : 9 }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${s.tinyText} font-semibold text-white leading-none`}>Loyalink</p>
          <p className={`${s.tinyText} text-white/75 leading-tight truncate mt-0.5`}>
            {earnedValue ? `${earnedValue} cashback earned` : 'Cashback earned'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Static, dense QR likeness (not a scannable code) — ported from CardPreview
// so the welcome card matches the real pass preview.
function RealisticQR({ px }: { px: number }) {
  return (
    <svg viewBox="0 0 25 25" style={{ width: px, height: px }} shapeRendering="crispEdges" aria-hidden="true">
      <rect width="25" height="25" fill="white" />
      <path d="M0,0h7v1H0zM0,6h7v1H0zM0,1h1v5H0zM6,1h1v5H6zM2,2h3v3H2z" fill="black" />
      <path d="M18,0h7v1H18zM18,6h7v1H18zM18,1h1v5H18zM24,1h1v5H24zM20,2h3v3H20z" fill="black" />
      <path d="M0,18h7v1H0zM0,24h7v1H0zM0,19h1v5H0zM6,19h1v5H6zM2,20h3v3H2z" fill="black" />
      <path d="M8,6h1v1H8zM10,6h1v1H10zM12,6h1v1H12zM14,6h1v1H14zM16,6h1v1H16z" fill="black" />
      <path d="M6,8h1v1H6zM6,10h1v1H6zM6,12h1v1H6zM6,14h1v1H6zM6,16h1v1H6z" fill="black" />
      <path d="M18,18h5v1H18zM18,22h5v1H18zM18,19h1v3H18zM22,19h1v3H22zM20,20h1v1H20z" fill="black" />
      <path d="M8,0h1v1H8zM10,0h1v1H10zM11,0h1v1H11zM13,0h1v1H13zM15,0h1v1H15z" fill="black" />
      <path d="M9,1h1v1H9zM11,1h1v1H11zM12,1h1v1H12zM14,1h1v1H14zM16,1h1v1H16z" fill="black" />
      <path d="M8,2h1v1H8zM10,2h1v1H10zM13,2h1v1H13zM15,2h1v1H15zM16,2h1v1H16z" fill="black" />
      <path d="M9,3h1v1H9zM10,3h1v1H10zM12,3h1v1H12zM14,3h1v1H14z" fill="black" />
      <path d="M8,4h1v1H8zM11,4h1v1H11zM13,4h1v1H13zM15,4h1v1H15zM16,4h1v1H16z" fill="black" />
      <path d="M9,5h1v1H9zM10,5h1v1H10zM12,5h1v1H12zM14,5h1v1H14z" fill="black" />
      <path d="M8,8h1v1H8zM9,8h1v1H9zM11,8h1v1H11zM13,8h1v1H13zM15,8h1v1H15zM17,8h1v1H17zM19,8h1v1H19zM21,8h1v1H21zM23,8h1v1H23z" fill="black" />
      <path d="M0,8h1v1H0zM2,8h1v1H2zM4,8h1v1H4z" fill="black" />
      <path d="M8,9h1v1H8zM10,9h1v1H10zM12,9h1v1H12zM14,9h1v1H14zM16,9h1v1H16zM18,9h1v1H18zM20,9h1v1H20zM22,9h1v1H22z" fill="black" />
      <path d="M1,9h1v1H1zM3,9h1v1H3zM5,9h1v1H5z" fill="black" />
      <path d="M7,10h1v1H7zM9,10h1v1H9zM11,10h1v1H11zM13,10h1v1H13zM15,10h1v1H15zM17,10h1v1H17zM19,10h1v1H19zM21,10h1v1H21zM24,10h1v1H24z" fill="black" />
      <path d="M0,10h1v1H0zM2,10h1v1H2zM4,10h1v1H4z" fill="black" />
      <path d="M8,11h1v1H8zM10,11h1v1H10zM11,11h1v1H11zM14,11h1v1H14zM16,11h1v1H16zM18,11h1v1H18zM20,11h1v1H20zM23,11h1v1H23z" fill="black" />
      <path d="M1,11h1v1H1zM3,11h1v1H3zM5,11h1v1H5z" fill="black" />
      <path d="M7,12h1v1H7zM9,12h1v1H9zM11,12h1v1H11zM13,12h1v1H13zM15,12h1v1H15zM17,12h1v1H17zM20,12h1v1H20zM22,12h1v1H22zM24,12h1v1H24z" fill="black" />
      <path d="M0,12h1v1H0zM2,12h1v1H2zM4,12h1v1H4z" fill="black" />
      <path d="M8,13h1v1H8zM10,13h1v1H10zM12,13h1v1H12zM14,13h1v1H14zM17,13h1v1H17zM19,13h1v1H19zM21,13h1v1H21zM23,13h1v1H23z" fill="black" />
      <path d="M1,13h1v1H1zM3,13h1v1H3z" fill="black" />
      <path d="M7,14h1v1H7zM9,14h1v1H9zM11,14h1v1H11zM14,14h1v1H14zM16,14h1v1H16zM18,14h1v1H18zM20,14h1v1H20zM22,14h1v1H22zM24,14h1v1H24z" fill="black" />
      <path d="M0,14h1v1H0zM2,14h1v1H2zM5,14h1v1H5z" fill="black" />
      <path d="M8,15h1v1H8zM10,15h1v1H10zM12,15h1v1H12zM13,15h1v1H13zM15,15h1v1H15zM17,15h1v1H17zM19,15h1v1H19zM21,15h1v1H21zM24,15h1v1H24z" fill="black" />
      <path d="M1,15h1v1H1zM4,15h1v1H4z" fill="black" />
      <path d="M7,16h1v1H7zM9,16h1v1H9zM11,16h1v1H11zM13,16h1v1H13zM15,16h1v1H15zM17,16h1v1H17z" fill="black" />
      <path d="M0,16h1v1H0zM3,16h1v1H3zM5,16h1v1H5z" fill="black" />
      <path d="M8,17h1v1H8zM10,17h1v1H10zM12,17h1v1H12zM14,17h1v1H14zM16,17h1v1H16z" fill="black" />
      <path d="M8,18h1v1H8zM10,18h1v1H10zM12,18h1v1H12zM14,18h1v1H14zM16,18h1v1H16z" fill="black" />
      <path d="M9,19h1v1H9zM11,19h1v1H11zM13,19h1v1H13zM15,19h1v1H15zM17,19h1v1H17z" fill="black" />
      <path d="M8,20h1v1H8zM10,20h1v1H10zM12,20h1v1H12zM14,20h1v1H14zM16,20h1v1H16z" fill="black" />
      <path d="M9,21h1v1H9zM11,21h1v1H11zM13,21h1v1H13zM15,21h1v1H15zM17,21h1v1H17z" fill="black" />
      <path d="M8,22h1v1H8zM10,22h1v1H10zM12,22h1v1H12zM15,22h1v1H15zM17,22h1v1H17z" fill="black" />
      <path d="M9,23h1v1H9zM11,23h1v1H11zM13,23h1v1H13zM14,23h1v1H14zM16,23h1v1H16z" fill="black" />
      <path d="M8,24h1v1H8zM10,24h1v1H10zM12,24h1v1H12zM15,24h1v1H15zM17,24h1v1H17z" fill="black" />
      <path d="M24,18h1v1H24zM24,20h1v1H24zM24,22h1v1H24zM24,24h1v1H24z" fill="black" />
      <path d="M23,19h1v1H23zM23,21h1v1H23zM23,23h1v1H23z" fill="black" />
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Scanner — replicates the real /scan UI: black background, X close top-left,
// instruction text, square viewfinder with corner brackets + scan line,
// "Enter manually" pill at the bottom.
// ──────────────────────────────────────────────────────────────────────────────

export function ScannerMockup({
  size = 'md',
  accent = ACCENT_DEFAULT,
}: {
  size?: Size
  accent?: string
}) {
  const s = SIZE[size]
  const viewfinderSize = size === 'sm' ? 64 : size === 'md' ? 88 : 110
  const cornerSize = size === 'sm' ? 14 : size === 'md' ? 18 : 22
  const cornerThickness = size === 'sm' ? 2 : 2.5

  return (
    <PhoneFrame size={size}>
      <ScreenContent size={size} className="bg-black">
        {/* Close button top-left */}
        <div
          className={`absolute left-2 z-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm`}
          style={{
            top: size === 'sm' ? 28 : 32,
            width: size === 'sm' ? 16 : 22,
            height: size === 'sm' ? 16 : 22,
          }}
        >
          <X className="text-white" style={{ width: size === 'sm' ? 8 : 11, height: size === 'sm' ? 8 : 11 }} />
        </div>

        {/* Instruction text */}
        <div
          className="absolute inset-x-0 text-center z-10"
          style={{ top: size === 'sm' ? 52 : 60 }}
        >
          <p className={`${s.bodyText} font-medium text-white/85`}>Place QR code in frame</p>
        </div>

        {/* Viewfinder centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: viewfinderSize, height: viewfinderSize }}>
            <Corner corner="tl" size={cornerSize} thickness={cornerThickness} />
            <Corner corner="tr" size={cornerSize} thickness={cornerThickness} />
            <Corner corner="bl" size={cornerSize} thickness={cornerThickness} />
            <Corner corner="br" size={cornerSize} thickness={cornerThickness} />

            {/* Faint QR placeholder inside */}
            <div className="absolute inset-3 opacity-25">
              <RealisticQR px={viewfinderSize - 24} />
            </div>

            {/* Animated scan line */}
            <div
              className="absolute left-1 right-1 h-px shadow-[0_0_10px_rgba(255,106,61,0.7)]"
              style={{
                top: '50%',
                background: `linear-gradient(90deg, transparent, ${accent} 50%, transparent)`,
                animation: 'mockup-scan 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Enter manually pill */}
        <div
          className="absolute inset-x-0 flex justify-center z-10"
          style={{ bottom: size === 'sm' ? 12 : 18 }}
        >
          <div
            className={`${s.bodyText} font-semibold rounded-full bg-white text-black shadow-lg`}
            style={{ padding: size === 'sm' ? '4px 10px' : '6px 14px' }}
          >
            Enter manually
          </div>
        </div>

        {/* Inline keyframes for the scan line */}
        <style>{`
          @keyframes mockup-scan {
            0%, 100% { transform: translateY(${viewfinderSize * 0.4}px); opacity: 0.4; }
            50% { transform: translateY(-${viewfinderSize * 0.4}px); opacity: 1; }
          }
        `}</style>
      </ScreenContent>
    </PhoneFrame>
  )
}

function Corner({
  corner,
  size,
  thickness,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br'
  size: number
  thickness: number
}) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    borderColor: '#fff',
  }
  const pos: React.CSSProperties =
    corner === 'tl'
      ? { top: 0, left: 0, borderTop: `${thickness}px solid #fff`, borderLeft: `${thickness}px solid #fff`, borderTopLeftRadius: 8 }
      : corner === 'tr'
        ? { top: 0, right: 0, borderTop: `${thickness}px solid #fff`, borderRight: `${thickness}px solid #fff`, borderTopRightRadius: 8 }
        : corner === 'bl'
          ? { bottom: 0, left: 0, borderBottom: `${thickness}px solid #fff`, borderLeft: `${thickness}px solid #fff`, borderBottomLeftRadius: 8 }
          : { bottom: 0, right: 0, borderBottom: `${thickness}px solid #fff`, borderRight: `${thickness}px solid #fff`, borderBottomRightRadius: 8 }
  return <div style={{ ...base, ...pos }} />
}

// ──────────────────────────────────────────────────────────────────────────────
// Small inline icon used in step 1 mini-cards
// ──────────────────────────────────────────────────────────────────────────────

export function MiniLoopIcon({ kind }: { kind: 'signup' | 'wallet' | 'scan' | 'cashback' }) {
  const Icon = kind === 'signup' ? QrCode : kind === 'wallet' ? Wallet : kind === 'scan' ? ScanLine : Sparkles
  return <Icon className="h-4 w-4 text-primary" />
}

// ──────────────────────────────────────────────────────────────────────────────
// Color helpers
// ──────────────────────────────────────────────────────────────────────────────

function clampChannel(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function parseHex(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(v, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => clampChannel(v).toString(16).padStart(2, '0')).join('')}`
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Pick black or white text for legibility on a given background colour.
function readableText(hex: string): string {
  const [r, g, b] = parseHex(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff'
}

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

function StatusBar({ size }: { size: Size }) {
  const s = SIZE[size]
  const pt = size === 'sm' ? 'pt-1' : 'pt-1.5'
  return (
    <div
      className={`absolute inset-x-0 top-0 ${pt} ${s.sidePad} flex items-center justify-between text-white/70 ${s.statusText} z-20 pointer-events-none`}
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
// Landing page — the customer-facing signup screen with logo, headline, form.
// ──────────────────────────────────────────────────────────────────────────────

export function LandingPageMockup({
  size = 'md',
  studioName,
  accent = ACCENT_DEFAULT,
}: {
  size?: Size
  studioName?: string
  accent?: string
}) {
  const s = SIZE[size]
  const fieldH = size === 'sm' ? 'h-3' : size === 'md' ? 'h-4' : 'h-5'
  const logoSize = size === 'sm' ? 28 : size === 'md' ? 36 : 44
  const initial = studioName?.trim().charAt(0).toUpperCase() ?? 'S'

  return (
    <PhoneFrame
      size={size}
      screenStyle={{
        background:
          'radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.04), transparent 60%), #0b0b0d',
      }}
    >
      <ScreenContent size={size}>
        <div className={`flex flex-col items-center gap-2 ${s.sidePad}`}>
          {/* Studio logo */}
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

          {/* Headline */}
          <div className="text-center space-y-0.5">
            <p className={`${s.titleText} font-bold text-white leading-tight tracking-tight`}>
              {studioName ? `Join ${studioName}` : 'Join Loyalty'}
            </p>
            <p className={`${s.tinyText} text-white/55 leading-tight`}>Cashback on every tattoo</p>
          </div>

          {/* Form stubs */}
          <div className="w-full space-y-1.5 mt-1">
            <FieldStub h={fieldH} label="Name" tinyText={s.tinyText} />
            <FieldStub h={fieldH} label="Email" tinyText={s.tinyText} />
            <FieldStub h={fieldH} label="Phone" tinyText={s.tinyText} />
          </div>

          {/* CTA */}
          <div
            className={`mt-1.5 w-full ${fieldH} ${s.cardRadius} flex items-center justify-center font-semibold tracking-tight shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] ${s.bodyText}`}
            style={{ backgroundColor: accent, color: '#fff' }}
          >
            Get my card
          </div>

          <p className={`${s.tinyText} text-white/35 text-center mt-1`}>
            Free · 30 seconds · No app needed
          </p>
        </div>
      </ScreenContent>
    </PhoneFrame>
  )
}

function FieldStub({ h, label, tinyText }: { h: string; label: string; tinyText: string }) {
  return (
    <div className="space-y-0.5">
      <p className={`${tinyText} text-white/35 leading-none`}>{label}</p>
      <div className={`${h} w-full rounded-md bg-white/[0.05] ring-1 ring-inset ring-white/[0.08]`} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Wallet pass — Apple Wallet-style loyalty card with header, strip, fields,
// QR area, and a peek at a second stacked card behind it.
// ──────────────────────────────────────────────────────────────────────────────

export function WalletPassMockup({
  size = 'md',
  studioName,
  accent = ACCENT_DEFAULT,
  balance = '0 kr',
  showCashbackBurst = false,
}: {
  size?: Size
  studioName?: string
  accent?: string
  balance?: string
  showCashbackBurst?: boolean
}) {
  const s = SIZE[size]
  const studioInitial = studioName?.trim().charAt(0).toUpperCase() ?? 'S'

  return (
    <PhoneFrame
      size={size}
      screenStyle={{
        background:
          'radial-gradient(140% 60% at 50% 0%, rgba(255,255,255,0.04), transparent 50%), #050507',
      }}
    >
      {/* Wallet header OR notification */}
      {showCashbackBurst ? (
        <CashbackNotification size={size} accent={accent} />
      ) : (
        <div
          className={`absolute top-7 inset-x-0 flex items-center justify-between ${s.sidePad} pointer-events-none z-10`}
        >
          <span className={`${s.tinyText} text-white/50 uppercase tracking-wider`}>Wallet</span>
          <span className={`${s.tinyText} text-white/40`}>•••</span>
        </div>
      )}

      <ScreenContent size={size} className="pt-12 sm:pt-12">
        <div className={`${s.sidePad} relative`}>
          {/* Peek of card stacked behind */}
          <div
            className={`absolute inset-x-2 -top-2 h-4 ${s.cardRadius} bg-zinc-700/40 ring-1 ring-white/5`}
            aria-hidden="true"
          />

          {/* Main wallet card */}
          <div
            className={`relative ${s.cardRadius} overflow-hidden shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/10`}
            style={{
              background: `linear-gradient(155deg, ${accent} 0%, ${darken(accent, 0.45)} 100%)`,
            }}
          >
            {/* Subtle top highlight */}
            <div
              className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)',
              }}
            />

            {/* Top row: logo + name | balance */}
            <div className={`relative flex items-start justify-between ${size === 'sm' ? 'p-2' : 'p-2.5'}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="rounded-full bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-white font-bold"
                  style={{
                    width: size === 'sm' ? 14 : 18,
                    height: size === 'sm' ? 14 : 18,
                    fontSize: size === 'sm' ? 7 : 9,
                  }}
                >
                  {studioInitial}
                </div>
                <span
                  className={`${s.tinyText} font-semibold text-white italic truncate`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {studioName ?? 'Studio'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[5px] uppercase tracking-wider text-white/65 leading-none font-medium">
                  Balance
                </p>
                <p className={`${s.bodyText} font-bold text-white leading-tight tabular-nums`}>{balance}</p>
              </div>
            </div>

            {/* Strip — gradient pattern */}
            <div
              className="relative border-y border-white/10"
              style={{
                height: size === 'sm' ? 32 : size === 'md' ? 44 : 56,
                background: `linear-gradient(135deg, ${lighten(accent, 0.15)} 0%, ${darken(accent, 0.55)} 100%)`,
              }}
            >
              {/* Pattern overlay */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 8px)',
                }}
              />
              {/* Subtle studio name watermark */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`${s.titleText} font-bold text-white/15 italic tracking-tight`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {studioName ?? 'Studio'}
                </span>
              </div>
            </div>

            {/* Bottom row: member | tier */}
            <div className={`relative flex items-end justify-between ${size === 'sm' ? 'p-2' : 'p-2.5'}`}>
              <div>
                <p className="text-[5px] uppercase tracking-wider text-white/65 leading-none font-medium">
                  Member
                </p>
                <p className={`${s.tinyText} font-medium text-white leading-tight mt-0.5`}>Anna L.</p>
              </div>
              <div className="text-right">
                <p className="text-[5px] uppercase tracking-wider text-white/65 leading-none font-medium">
                  Tier
                </p>
                <p className={`${s.tinyText} font-medium text-white leading-tight mt-0.5`}>Bronze</p>
              </div>
            </div>

            {/* QR code area */}
            <div className="bg-white px-2 py-1.5 flex items-center justify-center">
              <QRGrid size={size} />
            </div>
          </div>
        </div>
      </ScreenContent>
    </PhoneFrame>
  )
}

function QRGrid({ size }: { size: Size }) {
  const cellCount = 7
  const gridSize = size === 'sm' ? 26 : size === 'md' ? 32 : 40
  const cells = Array.from({ length: cellCount * cellCount }, (_, i) => i)
  // Deterministic pattern (Apple Wallet-like aztec/QR feel without being a real code)
  const pattern = [
    1, 1, 1, 0, 1, 1, 1,
    1, 0, 0, 1, 0, 0, 1,
    1, 0, 1, 0, 1, 0, 1,
    0, 1, 0, 1, 1, 1, 0,
    1, 0, 1, 0, 0, 1, 1,
    1, 0, 0, 1, 1, 0, 0,
    1, 1, 1, 0, 1, 1, 1,
  ]
  return (
    <div
      className="grid"
      style={{
        width: gridSize,
        height: gridSize,
        gridTemplateColumns: `repeat(${cellCount}, 1fr)`,
        gridTemplateRows: `repeat(${cellCount}, 1fr)`,
        gap: 1,
      }}
    >
      {cells.map((i) => (
        <div key={i} className={pattern[i] ? 'bg-black' : 'bg-white'} />
      ))}
    </div>
  )
}

function CashbackNotification({ size, accent }: { size: Size; accent: string }) {
  const s = SIZE[size]
  const topPos = size === 'sm' ? 22 : size === 'md' ? 28 : 32
  return (
    <div
      className="absolute inset-x-1 z-30 animate-celebrate"
      style={{ top: topPos }}
      aria-hidden="true"
    >
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
          <Sparkles
            className="text-white"
            style={{ width: size === 'sm' ? 7 : 9, height: size === 'sm' ? 7 : 9 }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${s.tinyText} font-semibold text-white leading-none`}>Loyalink</p>
          <p className={`${s.tinyText} text-white/75 leading-tight truncate mt-0.5`}>+50 kr earned</p>
        </div>
      </div>
    </div>
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
            {/* Corner brackets */}
            <Corner
              corner="tl"
              size={cornerSize}
              thickness={cornerThickness}
            />
            <Corner
              corner="tr"
              size={cornerSize}
              thickness={cornerThickness}
            />
            <Corner
              corner="bl"
              size={cornerSize}
              thickness={cornerThickness}
            />
            <Corner
              corner="br"
              size={cornerSize}
              thickness={cornerThickness}
            />

            {/* Faint QR placeholder inside */}
            <div className="absolute inset-3 opacity-25">
              <QRGrid size={size === 'sm' ? 'sm' : 'md'} />
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
            style={{
              padding: size === 'sm' ? '4px 10px' : '6px 14px',
            }}
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

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}


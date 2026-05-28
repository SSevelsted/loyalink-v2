'use client'

import { QrCode, ScanLine, Sparkles, Wallet } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg'

const SIZE: Record<Size, { width: string; padding: string; statusText: string; bodyText: string; headingText: string }> = {
  sm: { width: 'w-32', padding: 'p-2.5', statusText: 'text-[7px]', bodyText: 'text-[7px]', headingText: 'text-[9px]' },
  md: { width: 'w-44', padding: 'p-3', statusText: 'text-[8px]', bodyText: 'text-[9px]', headingText: 'text-[11px]' },
  lg: { width: 'w-56', padding: 'p-4', statusText: 'text-[10px]', bodyText: 'text-[10px]', headingText: 'text-sm' },
}

export function PhoneFrame({
  children,
  size = 'md',
  className = '',
}: {
  children: React.ReactNode
  size?: Size
  className?: string
}) {
  const s = SIZE[size]
  return (
    <div
      className={`relative ${s.width} aspect-[9/16] rounded-[1.75rem] bg-zinc-950 ring-1 ring-foreground/15 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.55)] overflow-hidden ${className}`}
    >
      {/* Notch */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-3 w-12 rounded-full bg-black z-10" />
      {/* Status bar */}
      <div className={`flex items-center justify-between px-4 pt-1.5 pb-1 text-foreground/55 ${s.statusText}`}>
        <span className="font-semibold tracking-tight">9:41</span>
        <div className="flex items-center gap-1">
          <span className="block h-1 w-1 rounded-full bg-foreground/40" />
          <span className="block h-1 w-1 rounded-full bg-foreground/40" />
          <span className="block h-1 w-1 rounded-full bg-foreground/40" />
        </div>
      </div>
      <div className={`${s.padding} h-full`}>{children}</div>
    </div>
  )
}

export function LandingPageMockup({
  size = 'md',
  studioName,
  accent = '#ff6a3d',
}: {
  size?: Size
  studioName?: string
  accent?: string
}) {
  const s = SIZE[size]
  return (
    <PhoneFrame size={size}>
      <div className="flex flex-col items-center gap-1.5 text-foreground/80">
        <div
          className="rounded-full ring-1 ring-foreground/15 flex items-center justify-center font-semibold"
          style={{
            width: size === 'sm' ? 18 : size === 'md' ? 26 : 34,
            height: size === 'sm' ? 18 : size === 'md' ? 26 : 34,
            backgroundColor: `${accent}26`,
            color: accent,
            fontSize: size === 'sm' ? 8 : 10,
          }}
        >
          {studioName?.charAt(0)?.toUpperCase() ?? 'S'}
        </div>
        <p className={`${s.headingText} font-semibold text-center leading-tight max-w-[80%] truncate`}>
          {studioName ? `Join ${studioName}` : 'Join Loyalty'}
        </p>
        <p className={`${s.bodyText} text-foreground/45 leading-tight text-center`}>Cashback on every tattoo</p>
        <div className="w-full space-y-1 mt-1">
          <FieldStub size={size} />
          <FieldStub size={size} />
          <FieldStub size={size} />
        </div>
        <div
          className={`mt-1 w-full rounded-md py-1 text-center font-semibold ${s.bodyText}`}
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          Get my card
        </div>
      </div>
    </PhoneFrame>
  )
}

function FieldStub({ size }: { size: Size }) {
  const h = size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-3.5'
  return <div className={`${h} w-full rounded-sm bg-foreground/10`} />
}

export function WalletPassMockup({
  size = 'md',
  studioName,
  accent = '#ff6a3d',
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
  const cardPad = size === 'sm' ? 'p-1.5' : size === 'md' ? 'p-2' : 'p-3'
  return (
    <PhoneFrame size={size}>
      <div className="flex flex-col items-center gap-2 pt-1 text-foreground/70">
        <p className={`${s.bodyText} text-foreground/50 uppercase tracking-wider`}>Wallet</p>

        <div
          className={`w-full rounded-xl ${cardPad} shadow-lg relative overflow-hidden`}
          style={{ backgroundColor: '#111', backgroundImage: `linear-gradient(135deg, ${accent}22, transparent 60%)` }}
        >
          <div className="flex items-center justify-between">
            <p className={`${s.bodyText} font-semibold italic`} style={{ color: accent }}>
              {studioName ?? 'Studio'}
            </p>
            <div className="text-right">
              <p className="text-[6px] uppercase tracking-wider text-white/40">Balance</p>
              <p className={`${s.bodyText} font-bold text-white leading-none`}>{balance}</p>
            </div>
          </div>
          <div className="mt-2 h-6 rounded-md bg-white/10" />
          <div className="mt-1.5 flex items-end justify-between">
            <div>
              <p className="text-[5px] uppercase tracking-wider text-white/40">Member</p>
              <p className="text-[7px] text-white/85">Anna L.</p>
            </div>
            <div className="h-5 w-5 rounded-sm bg-white grid grid-cols-3 grid-rows-3 gap-px p-0.5">
              <span className="bg-zinc-900" />
              <span className="bg-zinc-900" />
              <span />
              <span />
              <span className="bg-zinc-900" />
              <span className="bg-zinc-900" />
              <span className="bg-zinc-900" />
              <span />
              <span className="bg-zinc-900" />
            </div>
          </div>
        </div>

        <p className={`${s.bodyText} text-foreground/40 text-center leading-tight`}>Apple Wallet · Google Wallet</p>

        {showCashbackBurst && (
          <div
            className="absolute -right-1 top-10 rotate-6 rounded-full px-2 py-1 shadow-lg flex items-center gap-1 font-semibold text-white"
            style={{ backgroundColor: accent, fontSize: size === 'sm' ? 8 : 10 }}
          >
            <Sparkles className="h-2.5 w-2.5" />
            +50 kr
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}

export function ScannerMockup({ size = 'md', accent = '#ff6a3d' }: { size?: Size; accent?: string }) {
  const s = SIZE[size]
  const cornerSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
  const cornerThickness = '2px'
  return (
    <PhoneFrame size={size}>
      <div className="flex flex-col items-center gap-2 pt-1">
        <p className={`${s.bodyText} text-foreground/50 uppercase tracking-wider flex items-center gap-1`}>
          <ScanLine className="h-2.5 w-2.5" />
          Scan customer
        </p>

        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/80">
          <div className="absolute inset-3 grid place-items-center">
            <QrCode className="h-10 w-10 text-white/35" strokeWidth={1.5} />
          </div>
          <div className={`absolute top-2 left-2 ${cornerSize} border-t-[${cornerThickness}] border-l-[${cornerThickness}]`} style={{ borderColor: accent }} />
          <div className={`absolute top-2 right-2 ${cornerSize} border-t-[${cornerThickness}] border-r-[${cornerThickness}]`} style={{ borderColor: accent }} />
          <div className={`absolute bottom-2 left-2 ${cornerSize} border-b-[${cornerThickness}] border-l-[${cornerThickness}]`} style={{ borderColor: accent }} />
          <div className={`absolute bottom-2 right-2 ${cornerSize} border-b-[${cornerThickness}] border-r-[${cornerThickness}]`} style={{ borderColor: accent }} />
          <div
            className="absolute left-2 right-2 h-px"
            style={{ top: '50%', backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
          />
        </div>

        <p className={`${s.bodyText} text-foreground/45 text-center leading-tight`}>Point at the customer&rsquo;s pass</p>

        <div
          className={`w-full rounded-md py-1 text-center font-semibold ${s.bodyText}`}
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          Confirm amount
        </div>
      </div>
    </PhoneFrame>
  )
}

// Small inline icons used by step 1 mini-cards
export function MiniLoopIcon({ kind }: { kind: 'signup' | 'wallet' | 'scan' | 'cashback' }) {
  const Icon = kind === 'signup' ? QrCode : kind === 'wallet' ? Wallet : kind === 'scan' ? ScanLine : Sparkles
  return <Icon className="h-4 w-4 text-primary" />
}

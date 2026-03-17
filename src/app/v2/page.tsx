'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { LogoMark } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Menu,
  ArrowRight,
  Wallet,
  TrendingUp,
  Users,
  Bell,
  BarChart3,
  Sparkles,
  Check,
  X,
  Star,
  ChevronDown,
  Zap,
  CreditCard,
  Camera,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Calendar,
  ShoppingBag,
} from 'lucide-react'

/* ─────────────────────── NAV ─────────────────────── */

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className={`flex items-center justify-between px-6 md:px-10 py-4 transition-all duration-300 ${
          scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : ''
        }`}
      >
        <Link href="/v2" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <LogoMark className="h-full w-full text-white p-1" />
          </div>
          <span
            className="font-bold text-white text-sm uppercase tracking-[0.15em]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Loyalink
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs uppercase tracking-[0.15em] text-white/60 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:from-fuchsia-600 hover:to-violet-600 rounded-full px-5 font-semibold text-xs uppercase tracking-wider"
            asChild
          >
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-black border-white/10">
            <div className="flex flex-col gap-1 mt-8">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3 text-sm text-white/60 hover:text-white transition-colors uppercase tracking-wider"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full border-white/20 text-white" asChild>
                  <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                </Button>
                <Button className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white" asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>Get started</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}

/* ─────────────────────── HERO ─────────────────────── */

function WalletPassMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Back pass (tilted for depth) */}
      <div className="absolute inset-0 translate-x-6 -translate-y-3 rotate-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm" />

      {/* Front pass */}
      <div className="relative h-full w-full rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.10] to-white/[0.03] backdrop-blur-md overflow-hidden shadow-2xl shadow-fuchsia-500/10">
        {/* Gradient header */}
        <div className="h-[30%] bg-gradient-to-br from-fuchsia-500/70 via-violet-500/60 to-purple-600/50 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <LogoMark className="h-14 w-14 text-white/90 relative z-10" />
        </div>

        {/* Content lines */}
        <div className="p-6 space-y-5">
          <div className="space-y-2.5">
            <div className="h-3 w-28 rounded-full bg-white/15" />
            <div className="h-2 w-36 rounded-full bg-white/8" />
          </div>
          <div className="space-y-2.5">
            <div className="h-2 w-full rounded-full bg-white/6" />
            <div className="h-2 w-3/4 rounded-full bg-white/5" />
            <div className="h-2 w-5/6 rounded-full bg-white/6" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-white/10" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-24 rounded-full bg-white/12" />
              <div className="h-2 w-16 rounded-full bg-white/6" />
            </div>
          </div>
        </div>

        {/* Barcode */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end justify-center gap-[3px] h-10">
            {[...Array(28)].map((_, i) => (
              <div
                key={i}
                className="bg-white/15 rounded-sm"
                style={{
                  width: i % 3 === 0 ? '3px' : '2px',
                  height: `${30 + Math.sin(i * 0.7) * 18}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-end pb-12 md:pb-20 pt-24 px-6 md:px-10 overflow-hidden bg-black">
      {/* Large saturated gradient blobs — like the reference pink/purple/orange clouds */}
      <div className="absolute top-[-5%] right-[-5%] w-[900px] h-[900px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500/50 via-violet-500/40 to-transparent blur-[140px]" />
      </div>
      <div className="absolute top-[5%] right-[15%] w-[500px] h-[500px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400/40 via-orange-300/30 to-transparent blur-[100px]" />
      </div>
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/20 to-transparent blur-[120px]" />
      </div>

      {/* Small top-right text — like the reference */}
      <div className="absolute top-24 right-6 md:right-10 text-right hidden md:block z-20">
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">
          Stop running cheap deals.<br />
          The only loyalty platform<br />
          that delivers results.
        </p>
      </div>

      {/* Wallet pass visual — large, center-right, like the statue in the reference */}
      <div className="absolute top-[12%] right-[8%] md:right-[12%] z-10 hidden md:block">
        <WalletPassMockup className="w-[300px] h-[470px] lg:w-[340px] lg:h-[530px]" />
      </div>

      {/* Small left label — like the reference */}
      <div className="absolute top-[55%] left-6 md:left-10 hidden md:block z-20">
        <p className="text-[10px] text-white/30 uppercase tracking-[0.25em] leading-relaxed max-w-[180px]">
          Stop running cheap deals. The only platform that delivers loyalty and retention at every step.
        </p>
      </div>

      {/* Bottom content area */}
      <div className="relative z-20 w-full max-w-7xl mx-auto">
        {/* Headline — bottom left, large, overlapping the pass like the reference */}
        <h1
          className="text-[clamp(2.8rem,9vw,8.5rem)] font-bold leading-[0.88] tracking-tight text-white uppercase max-w-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="bg-gradient-to-r from-fuchsia-400 via-pink-300 to-orange-200 bg-clip-text text-transparent">
            Stop Discounting.
          </span>
          <br />
          <span className="text-white">
            Build Real Loyalty.
          </span>
        </h1>

        {/* Mobile wallet pass */}
        <div className="flex md:hidden justify-center my-8">
          <WalletPassMockup className="w-[220px] h-[340px]" />
        </div>

        {/* CTA button — bottom right, matching reference "TAKE A TOUR" placement */}
        <div className="mt-6 flex items-end justify-between">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] hidden md:block">
            Built for tattoo studios.<br />The only loyalty platform that delivers.
          </p>
          <div className="flex flex-col items-start md:items-end gap-3">
            <Button
              size="lg"
              className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:from-fuchsia-600 hover:to-violet-600 rounded-full px-8 h-12 text-sm font-semibold uppercase tracking-wider gap-2"
              asChild
            >
              <Link href="/signup">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">
              14 days free · No credit card
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── VALUE PROP ─────────────────────── */

function ValueProp() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-10 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-[auto_1fr_1fr] gap-8 md:gap-12 items-end">
          {/* Left: decorative gradient bust/totem — like the reference's statue bust */}
          <div className="hidden md:block">
            <div className="relative w-[160px] h-[340px] rounded-2xl overflow-hidden">
              {/* Gradient fill like the reference's pinkish statue */}
              <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-400/50 via-violet-400/40 to-purple-600/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
              {/* Large LogoMark as the "bust" silhouette */}
              <LogoMark className="absolute top-8 left-1/2 -translate-x-1/2 h-28 w-28 text-white/20" />
              {/* Decorative horizontal lines */}
              <div className="absolute bottom-16 left-4 right-4 space-y-2">
                <div className="h-px bg-white/10" />
                <div className="h-px bg-white/5" />
                <div className="h-px bg-white/10" />
              </div>
            </div>
          </div>

          {/* Center: heading */}
          <div>
            <h2
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white uppercase leading-[0.95] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              The future of loyalty works here.
            </h2>
          </div>

          {/* Right: body text with small label above — matching reference layout */}
          <div className="space-y-4">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.25em] leading-relaxed">
              Do more with less using the<br />only loyalty platform that delivers
            </p>
            <div className="w-8 h-px bg-white/10" />
            <p className="text-white/50 text-sm leading-relaxed">
              Give clients a reason to come back that isn&apos;t a discount or the aftercare cream you got for free.
              Cashback they can only spend with you — in their phone, no app needed.
              Scale your studio&apos;s capacity with the loyalty system that does more for everyone.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── FEATURES / SOLUTIONS ─────────────────────── */

const solutions = [
  {
    title: 'Wallet Passes',
    body: 'Passes live in customers\' phones the moment they sign up. Apple & Google Wallet — no app download, no friction. Just tap and go.',
    icon: Wallet,
    iconColor: 'text-emerald-400',
    accentColor: 'border-l-emerald-500/50',
    offset: '',
  },
  {
    title: 'Cashback Tiers',
    body: 'Silver, Gold, VIP — bigger spenders automatically earn higher cashback rates. Every purchase builds balance they can only spend with you. No discounts needed.',
    icon: TrendingUp,
    iconColor: 'text-fuchsia-400',
    accentColor: 'border-l-fuchsia-500/50',
    offset: 'md:ml-12',
  },
  {
    title: 'Referral Engine',
    body: 'Every time a client shows off fresh ink, someone asks "where did you get that?" Now they earn cashback for every friend they bring. Your clients become your best acquisition channel.',
    icon: Users,
    iconColor: 'text-blue-400',
    accentColor: 'border-l-blue-500/50',
    offset: 'md:ml-24',
  },
]

function Solutions() {
  return (
    <section id="features" className="relative py-24 md:py-40 px-6 md:px-10 bg-black">
      <div className="max-w-7xl mx-auto grid md:grid-cols-[1fr_1.1fr] gap-16 md:gap-20">
        {/* Left: heading + ghost text — matches reference exactly */}
        <div className="relative">
          <div className="md:sticky md:top-32">
            <h2
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white uppercase leading-[0.95] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Solutions that<br />make a difference
            </h2>
          </div>
        </div>

        {/* Right: staggered cards with increasing offset — like the reference */}
        <div className="space-y-5">
          {solutions.map((s) => (
            <div
              key={s.title}
              className={`relative rounded-xl border-l-2 ${s.accentColor} bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-7 md:p-8 ${s.offset}`}
            >
              <div className="mb-3">
                <h3
                  className="text-xs font-bold text-white uppercase tracking-[0.2em]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {s.title}
                </h3>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── BIG BRAND STRIP ─────────────────────── */

function BrandStrip() {
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Full vivid gradient background — matching reference's vibrant pink/purple/orange */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-violet-600 to-purple-700" />

      {/* Secondary warm gradient overlay for the pink/orange warmth */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/20 via-transparent to-pink-400/20" />

      {/* Architectural CSS element — columns/pillars like the reference's building image */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden opacity-30">
        <div className="flex gap-4 md:gap-6 -mb-8">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* Column capital */}
              <div className="w-12 md:w-16 h-4 md:h-6 bg-white/20 rounded-t-sm" />
              <div className="w-10 md:w-14 h-3 md:h-4 bg-white/15" />
              {/* Column shaft */}
              <div
                className="w-8 md:w-10 bg-gradient-to-b from-white/20 to-white/5 rounded-sm"
                style={{ height: `${120 + i * 15}px` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Geometric decorative rectangles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[8%] left-[5%] w-[250px] h-[160px] border border-white/10 rounded-lg rotate-6" />
        <div className="absolute bottom-[12%] right-[8%] w-[200px] h-[280px] border border-white/10 rounded-lg -rotate-3" />
      </div>

      <div className="relative z-10 w-full px-6 md:px-10">
        {/* Giant "Loyalink" text with blend mode — like "Hummingbird" in reference */}
        <div className="text-center">
          <p
            className="text-[clamp(3.5rem,14vw,13rem)] font-bold text-white/20 uppercase leading-none tracking-tight mix-blend-overlay"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Loyalink
          </p>
        </div>

        {/* Three category columns — matches reference's "ANTI-MONEY LAUNDERING" etc. */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 max-w-5xl mx-auto">
          {[
            { title: 'Wallet Passes', desc: 'See why Loyalink is considered the gold standard for mobile loyalty passes.' },
            { title: 'Cashback Loyalty', desc: 'Get why Loyalink is considered the gold standard for cashback retention.' },
            { title: 'Referral Engine', desc: 'Crystal-clear referrals and fast onboarding — everything is a breeze.' },
          ].map((cat) => (
            <div key={cat.title} className="text-center">
              <p
                className="text-xs md:text-sm font-bold text-white/90 uppercase tracking-[0.2em] mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {cat.title}
              </p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider leading-relaxed max-w-[240px] mx-auto">
                {cat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* "WHERE WE MAKE AN IMPACT" gradient text — matches reference */}
        <div className="mt-12 md:mt-16 text-center">
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="bg-gradient-to-r from-orange-300 via-pink-200 to-white bg-clip-text text-transparent">
              Where we make an impact
            </span>
          </h2>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── IMPACT / MORE FEATURES ─────────────────────── */

const impactFeatures = [
  {
    title: 'Push Notifications',
    body: 'Re-engage customers who haven\'t visited in a while. Send targeted wallet notifications directly to their lock screen.',
    icon: Bell,
    color: 'text-amber-400',
  },
  {
    title: 'Analytics Dashboard',
    body: 'See exactly who\'s loyal, who\'s slipping, and which promotions are working. Data you can act on, in real time.',
    icon: BarChart3,
    color: 'text-violet-400',
  },
  {
    title: 'AI Story Generator',
    body: 'Auto-generate Instagram and TikTok content to promote your loyalty program. Stay top of mind without the effort.',
    icon: Sparkles,
    color: 'text-pink-400',
  },
]

function Impact() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-10 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-t from-violet-500/10 to-transparent blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {impactFeatures.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 space-y-4 hover:border-white/10 transition-colors"
            >
              <f.icon className={`h-6 w-6 ${f.color}`} />
              <h3
                className="text-sm font-bold text-white uppercase tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {f.title}
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── INTEGRATIONS ─────────────────────── */

const integrationIcons = [
  { icon: CreditCard, color: 'bg-emerald-500', label: 'Payments' },
  { icon: Camera, color: 'bg-pink-500', label: 'Photo' },
  { icon: Mail, color: 'bg-blue-500', label: 'Email' },
  { icon: MessageSquare, color: 'bg-violet-500', label: 'Chat' },
  { icon: Smartphone, color: 'bg-amber-500', label: 'Mobile' },
  { icon: Globe, color: 'bg-cyan-500', label: 'Web' },
  { icon: Calendar, color: 'bg-rose-500', label: 'Booking' },
  { icon: ShoppingBag, color: 'bg-orange-500', label: 'Commerce' },
]

function Integrations() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-10 bg-black border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        {/* Heading — matching reference's bold uppercase style */}
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white uppercase leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hundreds of integrations<br />
            Infinite possibilities
          </h2>
        </div>

        {/* Icon row */}
        <div className="flex flex-wrap justify-center gap-5 md:gap-6 mb-14">
          {integrationIcons.map((item) => (
            <div
              key={item.label}
              className={`h-14 w-14 md:h-16 md:w-16 rounded-full ${item.color} flex items-center justify-center shadow-lg`}
            >
              <item.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
          ))}
        </div>

        {/* Description + button — matching the reference's bottom row */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 max-w-3xl mx-auto">
          <p className="text-white/40 text-sm leading-relaxed max-w-md">
            Loyalink allows you to quickly and easily connect the things that matter most. Core booking systems, new data sources, your favourite third-party tools — our app ecosystem makes it all possible.
          </p>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 rounded-full px-6 text-xs font-semibold uppercase tracking-wider shrink-0"
            asChild
          >
            <Link href="/signup">
              Take a tour
              <ArrowRight className="h-3.5 w-3.5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── HOW IT WORKS ─────────────────────── */

const steps = [
  {
    number: '01',
    title: 'Set up your program',
    body: 'Configure cashback rates, loyalty tiers, and your branded signup page in minutes. No dev work needed.',
  },
  {
    number: '02',
    title: 'Customers join in 30 seconds',
    body: 'No app download required. Customers scan your QR code and your loyalty pass lands straight in Apple or Google Wallet.',
  },
  {
    number: '03',
    title: 'They keep coming back',
    body: 'Every purchase automatically earns cashback they can only spend with you. Their wallet balance is their reason to return.',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32 px-6 md:px-10 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Loyalty in 3 steps
          </h2>
          <p className="text-white/40 mt-4 max-w-md mx-auto">
            From zero to a fully running loyalty program before your next customer walks in.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <span
                className="text-[6rem] font-bold text-white/[0.03] leading-none block"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {step.number}
              </span>
              <div className="mt-[-2rem] relative z-10">
                <h3
                  className="text-lg font-bold text-white uppercase tracking-wide mb-3"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {step.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── PAIN SECTION ─────────────────────── */

function Pain() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-10 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-xs text-red-400/60 uppercase tracking-[0.25em] mb-4">The problem</p>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            You&apos;ve tried everything.{' '}
            <span className="text-red-400/80">None of it sticks.</span>
          </h2>
          <p className="text-white/40 mt-6 leading-relaxed max-w-lg">
            Every tactic that&apos;s supposed to bring clients back ends up attracting the wrong ones — or devaluing the work you put your name on.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'Run big discounts',
              body: 'Your feed fills up with "what\'s your cheapest rate?" — from people comparing three studios at once. You trained them to shop on price.',
            },
            {
              title: 'Sell cheap vouchers',
              body: 'You sold €300 of work for €150. That client tells everyone they got tattooed for half price. You set a new price expectation.',
            },
            {
              title: 'Post every day and hustle',
              body: 'Hours of content, reels, stories — and the DMs are still "how much for something small?" People who value your craft aren\'t shopping around.',
            },
          ].map((trap) => (
            <div
              key={trap.title}
              className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-8 space-y-3"
            >
              <h3
                className="text-sm font-bold text-red-400/80 uppercase tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {trap.title}
              </h3>
              <p className="text-white/35 text-sm leading-relaxed">{trap.body}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-white/20 italic mt-12">
          &ldquo;The clients you win with discounts are the same ones who&apos;ll leave the moment someone else is cheaper.&rdquo;
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────── REFERRAL ─────────────────────── */

const discountTraits = [
  'Found you on a flash sale post',
  'First message: "how much for this?"',
  'Comparing you to four other studios',
  'Expects a sleeve for €500',
  'Never comes back at full price',
]

const referralTraits = [
  'Sent by a friend whose tattoo they\'ve been staring at for weeks',
  'Already trusts your work before they message',
  'Not shopping around — they want you specifically',
  'Knows what things cost because their friend told them',
  'Comes back. And sends the next one.',
]

function Referral() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-10 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Imagine 50 people promoting your studio{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-orange-300 bg-clip-text text-transparent">
              right now
            </span>
          </h2>
          <p className="text-white/40 mt-6 text-lg leading-relaxed">
            A fresh tattoo still wrapped in cling film turns heads. People ask. That moment is the best sales pitch your studio will ever have — and it&apos;s walking around for free.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-8 space-y-6">
            <p
              className="text-xs font-bold text-red-400/70 uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Discount client
            </p>
            <ul className="space-y-3">
              {discountTraits.map((trait) => (
                <li key={trait} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <X className="h-3 w-3 text-red-400/60" />
                  </div>
                  <span className="text-white/35 leading-snug">{trait}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-8 space-y-6">
            <p
              className="text-xs font-bold text-emerald-400/70 uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Referral client
            </p>
            <ul className="space-y-3">
              {referralTraits.map((trait) => (
                <li key={trait} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-emerald-400/60" />
                  </div>
                  <span className="text-white/35 leading-snug">{trait}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── COMPARISON ─────────────────────── */

const criteria = [
  'Attracts clients who value the work',
  'Clients always pay full price',
  'Built-in referral system',
  'See exactly who keeps coming back',
  'Works passively — not just when you post',
]

const compColumns = [
  { name: 'Flash Sales', values: [false, false, false, false, false] },
  { name: 'Voucher Deals', values: [false, false, false, false, true] },
  { name: 'Social Hustle', values: [true, true, false, false, false] },
  { name: 'Loyalink', values: [true, true, true, true, true], highlight: true },
]

function Comparison() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-10 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Qatar Airways does it.{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              So does Revolut and Amex.
            </span>
          </h2>
          <p className="text-white/40 mt-6 max-w-xl mx-auto">
            Every premium brand runs a loyalty program — not because it&apos;s trendy, but because keeping a good client is far cheaper than finding a new one.
          </p>
        </div>

        {/* Mobile */}
        <div className="md:hidden grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-5 space-y-4">
            <p className="text-xs font-bold text-red-400/70 uppercase tracking-wider">The rest</p>
            <ul className="space-y-3">
              {criteria.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <X className="h-3.5 w-3.5 text-white/15 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-white/30 leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5 space-y-4">
            <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider">Loyalink</p>
            <ul className="space-y-3">
              {criteria.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400/60 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-white/30 leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-5 text-xs text-white/30 font-medium uppercase tracking-wider">Feature</th>
                {compColumns.map((col) => (
                  <th
                    key={col.name}
                    className={`px-6 py-5 text-center text-xs font-bold uppercase tracking-wider ${
                      col.highlight
                        ? 'text-white bg-white/[0.03] border-l border-r border-white/5'
                        : 'text-white/30'
                    }`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, i) => (
                <tr key={criterion} className={i < criteria.length - 1 ? 'border-b border-white/[0.03]' : ''}>
                  <td className="px-6 py-4 text-white/50 font-medium">{criterion}</td>
                  {compColumns.map((col) => (
                    <td
                      key={col.name}
                      className={`px-6 py-4 text-center ${
                        col.highlight ? 'bg-white/[0.03] border-l border-r border-white/5' : ''
                      }`}
                    >
                      {col.values[i] ? (
                        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.03]">
                          <X className="h-3.5 w-3.5 text-white/15" />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── TESTIMONIALS ─────────────────────── */

const testimonials = [
  {
    quote: "We were doing Groupon every month just to fill the calendar. Since switching to Loyalink, our regulars spend 40% more and I haven't run a discount in four months.",
    name: 'Maria Jensen',
    role: 'Black Anchor Tattoo Studio',
    initials: 'MJ',
  },
  {
    quote: "The wallet pass thing is genuinely magic. Customers just tap and it's in their Apple Wallet. No app, no faff. We had 60 members in the first week.",
    name: 'Tom Eriksen',
    role: 'Inkline Copenhagen',
    initials: 'TE',
  },
  {
    quote: "I can see exactly who comes in regularly and who's drifting away. The analytics paid for itself the first time I sent a re-engagement push.",
    name: 'Sophie Andersen',
    role: 'Studio Noir',
    initials: 'SA',
  },
]

function Testimonials() {
  return (
    <section className="relative py-24 md:py-32 px-6 md:px-10 bg-black">
      <div className="max-w-7xl mx-auto">
        <h2
          className="text-4xl sm:text-5xl font-bold text-white uppercase leading-[0.95] tracking-tight mb-16 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Studios that escaped{' '}
          <span className="bg-gradient-to-r from-fuchsia-400 to-orange-300 bg-clip-text text-transparent">
            the rat race
          </span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/40 text-sm leading-relaxed flex-1 mb-6">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold text-white/60">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80">{t.name}</p>
                  <p className="text-xs text-white/30">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── TRUST BAR ─────────────────────── */

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1500
          const start = Date.now()
          const tick = () => {
            const progress = Math.min((Date.now() - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * end))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [end])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const stats = [
  { value: 200, suffix: '+', label: 'Studios' },
  { value: 50000, suffix: '+', label: 'Members' },
  { value: 2, prefix: '€', suffix: 'M+', label: 'Cashback earned' },
  { value: 4.9, suffix: '★', label: 'Rating' },
]

function TrustBar() {
  return (
    <section className="py-16 px-6 md:px-10 bg-[#0a0a0a] border-y border-white/5">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {stat.prefix ?? ''}
              <Counter end={stat.value} suffix={stat.suffix ?? ''} />
            </p>
            <p className="text-xs text-white/30 mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────── PRICING ─────────────────────── */

const plans = [
  {
    key: 'basic',
    name: 'Basic',
    price: '€49',
    description: 'Perfect for independent studios',
    features: [
      '1 location',
      'Apple & Google Wallet passes',
      'Cashback loyalty program',
      'Referral program',
      'Basic analytics',
      'Email support',
    ],
    popular: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '€79',
    description: 'For growing studios with a team',
    features: [
      'Up to 5 locations',
      'Everything in Basic',
      'Multi-tier loyalty (Silver/Gold/VIP)',
      'Automated push notifications',
      'Audience segmentation',
      'AI Story Generator',
      '5 team logins',
      'Priority support',
    ],
    popular: true,
  },
]

const memberRates = [
  { label: 'First 100 members', rate: '€0.79 each' },
  { label: '101 – 500', rate: '€0.59 each' },
  { label: '501 – 2,000', rate: '€0.39 each' },
  { label: '2,000+', rate: '€0.29 each' },
]

function Pricing() {
  return (
    <section id="pricing" className="relative py-24 md:py-32 px-6 md:px-10 bg-black">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Simple pricing.{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              Powerful loyalty.
            </span>
          </h2>
          <p className="text-white/40 mt-4">Start free for 14 days. Cancel before day 15 and you pay nothing.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-8 space-y-6 ${
                plan.popular
                  ? 'border-fuchsia-500/30 bg-fuchsia-500/[0.03]'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
                    <Zap className="h-3 w-3" />
                    Most popular
                  </span>
                </div>
              )}

              <div>
                <p
                  className="text-sm font-bold text-white uppercase tracking-[0.1em]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span
                    className="text-4xl font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-white/30 text-sm">/mo + usage</span>
                </div>
                <p className="text-xs text-white/25 mt-1">{plan.description}</p>
              </div>

              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    </div>
                    <span className="text-white/50">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full rounded-full font-semibold uppercase tracking-wider text-xs h-11 ${
                  plan.popular
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
                }`}
                asChild
              >
                <Link href={`/signup?plan=${plan.key}`}>Start free trial</Link>
              </Button>
            </div>
          ))}
        </div>

        <details className="max-w-2xl mx-auto mt-10 group">
          <summary className="flex items-center justify-center gap-2 cursor-pointer text-xs text-white/30 hover:text-white/50 transition-colors list-none uppercase tracking-wider">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            View per-member usage pricing
          </summary>
          <div className="mt-4 rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Active members</th>
                  <th className="text-right px-5 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Monthly rate</th>
                </tr>
              </thead>
              <tbody>
                {memberRates.map((r, i) => (
                  <tr key={r.label} className={i < memberRates.length - 1 ? 'border-b border-white/[0.03]' : ''}>
                    <td className="px-5 py-3 text-white/50">{r.label}</td>
                    <td className="px-5 py-3 text-right text-white/60 font-medium">{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-3">
            An active member is any customer who earned or redeemed cashback in that calendar month.
          </p>
        </details>
      </div>
    </section>
  )
}

/* ─────────────────────── FAQ ─────────────────────── */

const faqs = [
  {
    q: 'Do my customers need to download an app?',
    a: 'No. Loyalink passes go directly into Apple Wallet or Google Wallet — the pre-installed apps on every iPhone and Android. Zero app downloads required.',
  },
  {
    q: 'How does the 14-day free trial work?',
    a: 'You get full access to all features for 14 days at no cost. We collect payment details upfront for seamless activation, but you won\'t be charged during the trial.',
  },
  {
    q: 'What happens when the trial ends?',
    a: 'On day 15, your subscription begins. We\'ll email you a reminder a few days before. Cancel any time before then.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your settings with one click — no phone calls, no retention flows. Your data is exportable at any time.',
  },
  {
    q: 'How does cashback work — does it cost me money?',
    a: 'Cashback is funded by you as a configurable percentage (typically 3–10%). The key difference from a discount: cashback can only be spent at your studio. The money stays in your ecosystem.',
  },
  {
    q: "What's the difference between Basic and Pro?",
    a: 'Basic is great for single-location studios. Pro adds multi-tier loyalty, automated push notifications, audience segmentation, AI Story Generator, and up to 5 locations.',
  },
]

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="relative py-24 md:py-32 px-6 md:px-10 bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-4xl sm:text-5xl font-bold text-white uppercase leading-[0.95] tracking-tight text-center mb-16"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Questions?{' '}
          <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            Answers.
          </span>
        </h2>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-xl border transition-colors ${
                openIndex === i ? 'border-white/10 bg-white/[0.02]' : 'border-white/5'
              }`}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-sm font-medium text-white/80 pr-4">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-white/30 shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-white/35 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── CTA ─────────────────────── */

function FinalCta() {
  return (
    <section className="relative py-20 md:py-28 px-6 md:px-10 overflow-hidden">
      {/* Full vivid gradient — matching reference CTA exactly */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-purple-600" />
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/15 via-transparent to-pink-400/15" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <h2
          className="text-5xl sm:text-6xl lg:text-8xl font-bold text-white uppercase leading-[0.9] tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Get in touch
        </h2>
        <p className="text-white/80 mt-6 text-base md:text-lg max-w-md leading-relaxed">
          <span className="font-semibold text-white">Better tools. Better outcomes.</span>
          <br />
          <span className="font-semibold text-white">Better loyalty.</span>
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            className="bg-black text-white hover:bg-black/80 rounded-full px-8 h-12 text-sm font-semibold uppercase tracking-wider gap-2"
            asChild
          >
            <Link href="/signup">
              Join now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── FOOTER ─────────────────────── */

const footerColumns = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'How it works', href: '#how-it-works' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="grid sm:grid-cols-4 gap-10 mb-16">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <LogoMark className="h-full w-full text-white p-1" />
              </div>
              <span
                className="font-bold text-white text-sm uppercase tracking-[0.15em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Loyalink
              </span>
            </div>
            <p className="text-xs text-white/20 leading-relaxed max-w-[180px]">
              Do more with less using the only loyalty platform that delivers.
            </p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.heading} className="space-y-4">
              <p className="text-xs font-bold text-white/40 uppercase tracking-[0.15em]">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-white/25 hover:text-white/60 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/15">&copy; 2025 Loyalink. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-white/15 hover:text-white/40 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-white/15 hover:text-white/40 transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Giant brand name — clipped at bottom like reference's "HUMMINGBIRD" */}
      <div className="h-[10rem] md:h-[14rem] overflow-hidden relative">
        <p
          className="text-[clamp(6rem,22vw,22rem)] font-bold text-white/[0.06] uppercase leading-[0.85] tracking-tight text-center select-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Loyalink
        </p>
      </div>
    </footer>
  )
}

/* ─────────────────────── PAGE ─────────────────────── */

export default function V2Page() {
  return (
    <div className="min-h-screen bg-black">
      <Nav />
      <main>
        <Hero />
        <ValueProp />
        <TrustBar />
        <Pain />
        <Solutions />
        <BrandStrip />
        <Impact />
        <Integrations />
        <HowItWorks />
        <Referral />
        <Comparison />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

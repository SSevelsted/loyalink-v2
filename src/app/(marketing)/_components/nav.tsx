'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { LogoMark } from '@/components/logo'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
      <nav className="flex items-center justify-between gap-6 rounded-full border border-white/[0.10] bg-background/80 backdrop-blur-md px-5 py-2.5 shadow-lg shadow-black/20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <LogoMark className="h-full w-full text-primary p-1" />
          </div>
          <span className="font-semibold text-foreground text-sm" style={{ fontFamily: 'var(--font-display)' }}>Loyalink</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild className="rounded-full">
            <Link href="/signup">Start free trial</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-1 mt-8">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>Start free trial</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}

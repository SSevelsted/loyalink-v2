'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  ScanLine,
} from 'lucide-react'
import { ScanDialog } from '@/components/scanner/scan-dialog'

const leftTabs = [
  { title: 'Dashboard', href: '/overview', icon: LayoutDashboard },
  { title: 'Customers', href: '/customers', icon: Users },
]

const rightTabs = [
  { title: 'Wallet', href: '/wallet', icon: Wallet },
  { title: 'Settings', href: '/settings', icon: Settings },
]

function NavTab({ tab, pathname }: { tab: typeof leftTabs[number]; pathname: string }) {
  const isActive = tab.href === '/overview' ? pathname === '/overview' : pathname.startsWith(tab.href)
  return (
    <Link
      href={tab.href}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      {isActive && (
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary glow-primary-sm animate-scale-in" />
      )}
      <tab.icon className="h-5 w-5" />
      <span className="text-[10px] font-medium leading-none">{tab.title}</span>
    </Link>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const [scanOpen, setScanOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass pb-safe md:hidden">
        <div className="flex h-16 items-center px-2">
          {leftTabs.map((tab) => (
            <NavTab key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/* Center scan button — flex-1 wrapper keeps it truly centered */}
          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => setScanOpen(true)}
              className="relative -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground glow-primary active:scale-95 transition-transform"
            >
              <ScanLine className="h-6 w-6" />
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary animate-pulse border-2 border-background" />
            </button>
          </div>

          {rightTabs.map((tab) => (
            <NavTab key={tab.href} tab={tab} pathname={pathname} />
          ))}
        </div>
      </nav>

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </>
  )
}

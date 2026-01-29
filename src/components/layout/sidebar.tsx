'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Wallet,
  Settings,
  Shield,
  ScanLine,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { StudioSwitcher } from './studio-switcher'
import { UserNav } from './header'
import { useStudio } from '@/hooks/use-studio'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Customers', href: '/customers', icon: Users },
  { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Wallet', href: '/wallet', icon: Wallet },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { membership } = useStudio()

  const showAdmin = membership?.role === 'super_admin'

  return (
    <Sidebar className="border-r-0 glass-card !border-0 !border-r !border-white/[0.06]">
      <SidebarHeader className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <span className="text-primary font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>L</span>
          </div>
          <span className="text-lg tracking-tight font-semibold text-foreground">
            Loyalink
          </span>
        </Link>
      </SidebarHeader>

      <div className="px-4 pb-3">
        <StudioSwitcher />
      </div>

      <Separator className="opacity-50" />

      <SidebarContent className="px-3 pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-11 rounded-lg px-3 transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px] shadow-primary/20 glow-primary-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/admin'}
                    className={`h-10 rounded-lg px-3 transition-all duration-200 ${
                      pathname === '/admin'
                        ? 'bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px] shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <Separator className="opacity-50" />
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  )
}

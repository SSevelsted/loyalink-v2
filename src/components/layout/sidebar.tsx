'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  Users,
  ArrowLeftRight,
  Bell,
  Wallet,
  Sparkles,
  Settings,
  Shield,
  Eye,
  LifeBuoy,
  Gift,
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
  useSidebar,
} from '@/components/ui/sidebar'
import { StudioSwitcher } from './studio-switcher'
import { UserNav } from './header'
import { useStudio } from '@/hooks/use-studio'
import { usePassTemplates } from '@/hooks/use-wallet'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { title: 'Dashboard', href: '/overview', icon: LayoutDashboard },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Customers', href: '/customers', icon: Users },
  { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Notifications', href: '/notifications', icon: Bell },
  { title: 'Wallet', href: '/wallet', icon: Wallet },
  { title: 'Promotions', href: '/promotions', icon: Gift },
  { title: 'Stories', href: '/stories', icon: Sparkles },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Support', href: '/support', icon: LifeBuoy },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { setOpenMobile, isMobile } = useSidebar()
  const { currentStudio, studios, isSuperAdmin, ownStudioIds } = useStudio()
  const { data: templates } = usePassTemplates()

  // Super admin is a global capability — show the Admin tab on every studio,
  // not just ones where the user has no real membership. (On studios they also
  // own, membership.role is 'owner', which previously hid the tab.)
  const showAdmin = isSuperAdmin
  const showSwitcher = isSuperAdmin || studios.length > 1
  const isViewingOtherStudio = isSuperAdmin && currentStudio && !ownStudioIds.has(currentStudio.id)
  const studioLogo = templates?.[0]?.icon_url ?? templates?.[0]?.logo_url

  return (
    <Sidebar className="border-r-0 glass-card !border-0 !border-r !border-white/[0.06]">
      <SidebarHeader className="px-5 py-5">
        {showSwitcher ? (
          <StudioSwitcher />
        ) : (
          <Link href="/overview" className="flex items-center gap-2.5 group" onClick={() => { if (isMobile) setOpenMobile(false) }}>
            {studioLogo ? (
              <Image
                src={studioLogo}
                alt={currentStudio?.name ?? 'Studio'}
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="text-primary font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                  {currentStudio?.name?.charAt(0) ?? 'S'}
                </span>
              </div>
            )}
            <span className="text-lg tracking-tight font-semibold text-foreground truncate">
              {currentStudio?.name ?? 'Studio'}
            </span>
          </Link>
        )}
        {isViewingOtherStudio && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 mt-2">
            <Eye className="h-3 w-3 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-400">Viewing as admin</span>
          </div>
        )}
      </SidebarHeader>

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
                      <Link href={item.href} onClick={() => { if (isMobile) setOpenMobile(false) }}>
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
                    <Link href="/admin" onClick={() => { if (isMobile) setOpenMobile(false) }}>
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
        <p className="text-[10px] text-muted-foreground/60 text-center tracking-wider">
          Powered by Loyalink
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}

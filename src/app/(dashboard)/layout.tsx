'use client'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useStudio } from '@/hooks/use-studio'
import { useAuth } from '@/hooks/use-auth'
import { Building2, Menu } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading: authLoading } = useAuth()
  const { loading: studioLoading, currentStudio } = useStudio()
  const pathname = usePathname()
  const router = useRouter()

  // Onboarding guard
  useEffect(() => {
    if (authLoading || studioLoading || !currentStudio) return
    const settings = currentStudio.settings as Record<string, unknown> | undefined
    const completed = settings?.onboarding_completed === true
    const isSetupPage = pathname === '/setup'

    if (!completed && !isSetupPage) {
      router.replace('/setup')
    }
  }, [authLoading, studioLoading, currentStudio, pathname, router])

  if (authLoading || studioLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold" style={{ fontFamily: 'var(--font-display)' }}>L</span>
          </div>
          <div className="h-1.5 w-32 mx-auto rounded-full animate-shimmer" />
        </div>
      </div>
    )
  }

  if (!currentStudio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm animate-fade-up">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No studio found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You are not a member of any studio yet. Ask an admin to send you an invitation link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center gap-3 glass-card border-0 border-b border-white/[0.08] px-4 py-3 md:hidden">
          <SidebarTrigger>
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <span className="font-semibold text-foreground tracking-tight">Loyalink</span>
        </div>
        <div className="p-4 pb-24 md:p-8 md:pb-8 max-w-7xl">
          {children}
        </div>
      </main>
      <BottomNav />
    </SidebarProvider>
  )
}

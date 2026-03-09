'use client'

import Link from 'next/link'
import Image from 'next/image'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useStudio } from '@/hooks/use-studio'
import { useAuth } from '@/hooks/use-auth'
import { usePassTemplates } from '@/hooks/use-wallet'
import { Building2, Menu } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isSubscriptionActive } from '@/lib/stripe'
import { SubscriptionWall } from './_components/subscription-wall'
import { TrialBanner } from './_components/trial-banner'
import { LogoMark } from '@/components/logo'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const { loading: studioLoading, currentStudio, membership } = useStudio()
  const { data: templates } = usePassTemplates()
  const pathname = usePathname()
  const router = useRouter()
  const studioLogo = templates?.[0]?.icon_url ?? templates?.[0]?.logo_url

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [authLoading, user, pathname, router])

  // Onboarding guard
  useEffect(() => {
    if (authLoading || studioLoading || !currentStudio) return
    const settings = currentStudio.settings as Record<string, unknown> | undefined
    const completed = settings?.onboarding_completed === true
    const isSetupPage = pathname === '/setup'

    if (!completed && !isSetupPage && membership?.role !== 'super_admin') {
      router.replace('/setup')
    }
  }, [authLoading, studioLoading, currentStudio, membership, pathname, router])

  // Subscription wall — show for cancelled/past_due (super_admin and /setup bypass)
  const showSubscriptionWall =
    !authLoading &&
    !studioLoading &&
    !!currentStudio &&
    membership?.role !== 'super_admin' &&
    pathname !== '/setup' &&
    !isSubscriptionActive(currentStudio.subscription_status)

  // Trial banner — show when ≤ 7 days left
  const showTrialBanner =
    !authLoading &&
    !studioLoading &&
    !!currentStudio &&
    currentStudio.subscription_status === 'trial' &&
    !!currentStudio.trial_ends_at

  if (authLoading || studioLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <LogoMark className="h-full w-full text-primary p-2" />
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

  if (showSubscriptionWall) {
    return <SubscriptionWall status={currentStudio.subscription_status} />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto h-svh">
        {showTrialBanner && (
          <TrialBanner trialEndsAt={currentStudio.trial_ends_at!} />
        )}
        <div className="flex items-center gap-3 glass-card border-0 border-b border-white/[0.08] px-4 py-3 md:hidden">
          <SidebarTrigger>
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <Link href="/" className="flex items-center gap-2 min-w-0">
            {studioLogo ? (
              <Image
                src={studioLogo}
                alt={currentStudio?.name ?? 'Studio'}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-[10px]" style={{ fontFamily: 'var(--font-display)' }}>
                  {currentStudio?.name?.charAt(0) ?? 'S'}
                </span>
              </div>
            )}
            <span className="font-semibold text-foreground tracking-tight truncate">
              {currentStudio?.name ?? 'Loyalink'}
            </span>
          </Link>
        </div>
        <div className="p-4 pb-24 md:p-8 md:pb-8 max-w-7xl">
          {children}
        </div>
      </main>
      <BottomNav />
    </SidebarProvider>
  )
}

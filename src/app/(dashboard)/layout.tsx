'use client'

import Link from 'next/link'
import Image from 'next/image'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { useStudio } from '@/hooks/use-studio'
import { useAuth } from '@/hooks/use-auth'
import { usePassTemplates } from '@/hooks/use-wallet'
import { Building2, Menu, ArrowRight, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isNative } from '@/lib/platform'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isSubscriptionActive } from '@/lib/stripe'
import { SubscriptionWall } from './_components/subscription-wall'
import { LogoMark } from '@/components/logo'
import { Providers } from '@/app/providers'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  )
}

function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading, signOut } = useAuth()
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

  if (authLoading || studioLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
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
    const onNative = isNative()
    const handleSignOut = async () => {
      await signOut()
      router.replace('/login')
    }
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 pt-safe pb-safe">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
        </div>
        <div className="relative text-center space-y-5 max-w-sm animate-fade-up w-full">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Welcome to Loyalink</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {onNative
                ? "You're signed in, but this account doesn't have a studio yet."
                : "You're signed in, but this account doesn't have a studio yet. Pick a plan to get started."}
            </p>
          </div>
          {onNative ? (
            <a
              href="mailto:hello@loyalink.ai"
              className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact support
            </a>
          ) : (
            <Button
              className="w-full"
              variant="glow"
              size="lg"
              onClick={() => router.push('/onboarding/subscribe')}
            >
              Create your studio
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            If you were invited to an existing studio, ask the owner to resend your invite.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors active:opacity-70"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
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
      <main className="flex-1 overflow-auto h-dvh overscroll-none bg-background">
        {!isNative() && (
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
        )}
        <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:px-8 md:py-8 max-w-7xl">
          {children}
        </div>
      </main>
      <BottomNav />
    </SidebarProvider>
  )
}

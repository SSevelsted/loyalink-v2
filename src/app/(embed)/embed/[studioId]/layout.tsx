'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { StudioContext } from '@/hooks/use-studio'
import type { Studio, StudioMember } from '@/types/database'
import { Toaster } from '@/components/ui/sonner'

export default function EmbedLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ studioId: string }>
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const token = searchParams.get('token')

  const [studioId, setStudioId] = useState<string | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  // Resolve params
  useEffect(() => {
    params.then(p => setStudioId(p.studioId))
  }, [params])

  // Fetch studio data using embed token
  useEffect(() => {
    if (!studioId || !token) {
      if (!token) setError('Missing embed token')
      return
    }

    async function fetchStudio() {
      try {
        const res = await fetch(`/api/embed/studio?studioId=${studioId}&token=${token}`)
        if (!res.ok) {
          setError('Invalid or expired embed token')
          setLoading(false)
          return
        }
        const data = await res.json()
        setStudio(data.studio)
        setLoading(false)
      } catch {
        setError('Failed to load studio')
        setLoading(false)
      }
    }

    fetchStudio()
  }, [studioId, token])

  // Synthetic membership (admin access for embed)
  const syntheticMembership: StudioMember | null = useMemo(() => {
    if (!studio || !studioId) return null
    return {
      id: 'embed',
      studio_id: studioId,
      user_id: 'embed',
      role: 'admin' as const,
      joined_at: new Date().toISOString(),
    }
  }, [studio, studioId])

  const studioContextValue = useMemo(
    () => ({
      studios: studio ? [studio] : [],
      currentStudio: studio,
      membership: syntheticMembership,
      setCurrentStudioId: () => {},
      refresh: () => {},
      loading,
      isSuperAdmin: false,
      ownStudioIds: new Set<string>(),
    }),
    [studio, syntheticMembership, loading]
  )

  // Send postMessage to parent on route changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ type: 'loyalink:route', pathname }, '*')
    }
  }, [pathname])

  // Notify parent when ready
  useEffect(() => {
    if (!loading && studio && typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ type: 'loyalink:ready', studioId }, '*')
    }
  }, [loading, studio, studioId])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-1.5 w-32 mx-auto rounded-full animate-shimmer" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StudioContext.Provider value={studioContextValue}>
        <main className="min-h-dvh bg-background">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <Toaster />
      </StudioContext.Provider>
    </QueryClientProvider>
  )
}

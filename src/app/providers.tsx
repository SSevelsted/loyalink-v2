'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { StudioContext } from '@/hooks/use-studio'
import { useStudioLoader } from '@/hooks/use-studio'
import { useAuth } from '@/hooks/use-auth'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Toaster } from '@/components/ui/sonner'

/** Registers for native push notifications when user is authenticated */
function PushRegistration() {
  const { user } = useAuth()
  usePushNotifications(user?.id)
  return null
}

function StudioProvider({ children }: { children: React.ReactNode }) {
  const studioData = useStudioLoader()
  return (
    <StudioContext.Provider value={studioData}>
      <PushRegistration />
      {children}
    </StudioContext.Provider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
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

  return (
    <QueryClientProvider client={queryClient}>
      <StudioProvider>
        {children}
        <Toaster />
      </StudioProvider>
    </QueryClientProvider>
  )
}

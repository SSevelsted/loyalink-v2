'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { StudioContext } from '@/hooks/use-studio'
import { useStudioLoader } from '@/hooks/use-studio'
import { Toaster } from '@/components/ui/sonner'

function StudioProvider({ children }: { children: React.ReactNode }) {
  const studioData = useStudioLoader()
  return (
    <StudioContext.Provider value={studioData}>
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

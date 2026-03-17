'use client'

import { LogoMark } from '@/components/logo'
import { Button } from '@/components/ui/button'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-6">
      <div className="h-14 w-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
        <LogoMark className="h-full w-full text-primary p-2" />
      </div>
      <div className="space-y-2">
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm">An unexpected error occurred. Please try again.</p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}

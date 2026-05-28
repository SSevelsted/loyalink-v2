'use client'

import { useState, useSyncExternalStore } from 'react'
import { Smartphone, X } from 'lucide-react'
import { AppleLogo } from '@/components/ui/apple-logo'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { isNative } from '@/lib/platform'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/constants'

type DownloadAppCardProps = {
  /** localStorage key used to remember dismissal. If omitted, the card is not dismissible. */
  dismissKey?: string
  className?: string
}

const subscribeNoop = () => () => {}

function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false)
}

function readDismissed(key: string | undefined): boolean {
  if (!key || typeof window === 'undefined') return false
  return window.localStorage.getItem(key) === '1'
}

export function DownloadAppCard({ dismissKey, className = '' }: DownloadAppCardProps) {
  const isClient = useIsClient()
  const [dismissed, setDismissed] = useState(false)

  // Avoid SSR/hydration mismatch and hide inside the native shell.
  if (!isClient || isNative()) return null
  if (dismissed || readDismissed(dismissKey)) return null

  const handleDismiss = () => {
    setDismissed(true)
    if (dismissKey && typeof window !== 'undefined') {
      window.localStorage.setItem(dismissKey, '1')
    }
  }

  return (
    <Card variant="glass" className={`relative rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden ${className}`}>
      <CardContent className="p-5">
        {dismissKey && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Get the Loyalink app</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scan customers faster and manage your studio on the go.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <AppleLogo className="h-4 w-4" />
                App Store
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
                <PlayIcon className="h-4 w-4" />
                Google Play
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.6 2.3a1.3 1.3 0 0 0-.7 1.15v17.1c0 .47.26.9.7 1.13L13 12 3.6 2.3Zm10.7 10.45 2.7 2.7-10.3 5.93 7.6-8.63Zm0-1.5L6.7 2.62 17 8.55l-2.7 2.7Zm6.9 2.13-2.8 1.6-3-3 3-3 2.8 1.6c1.05.6 1.05 2.2 0 2.8Z" />
    </svg>
  )
}

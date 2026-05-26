'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { createClient } from '@/lib/supabase/client'

function getSafeRedirect(next: string | null): string {
  if (!next) return '/overview'
  if (!next.startsWith('/') || next.startsWith('//')) return '/overview'
  return next
}

function NativeCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Finishing sign in...')

  useEffect(() => {
    const completeSignIn = async () => {
      const code = searchParams.get('code')
      const next = getSafeRedirect(searchParams.get('next'))

      if (!code) {
        router.replace('/login?error=auth_callback_missing_code')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        setMessage('Sign in failed. Sending you back...')
        router.replace('/login?error=auth_callback_failed')
        return
      }

      router.replace(next)
    }

    void completeSignIn()
  }, [router, searchParams])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 pt-safe pb-safe">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 glow-primary">
          <LogoMark className="h-full w-full p-3 text-primary" />
        </div>
        <div className="space-y-2">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default function NativeCallbackPage() {
  return (
    <Suspense>
      <NativeCallbackContent />
    </Suspense>
  )
}

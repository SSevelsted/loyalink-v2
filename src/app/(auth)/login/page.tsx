'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { isNative } from '@/lib/platform'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)
  const [onNative, setOnNative] = useState(false)

  useEffect(() => {
    setOnNative(isNative())
  }, [])
  const { signInWithEmail, signInWithGoogle, signInWithApple, resetPasswordForEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signInWithEmail(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const redirect = searchParams.get('redirect') || '/overview'
    router.push(redirect)
  }

  const handleAppleSignIn = async () => {
    setError(null)
    setLoading(true)
    const { error } = await signInWithApple()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // On iOS native the sign-in completes in-process (no OAuth redirect),
    // so we navigate manually. On web/Android, the OAuth redirect happens
    // before this line runs and this push is a no-op.
    const redirect = searchParams.get('redirect') || '/overview'
    router.push(redirect)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await resetPasswordForEmail(email)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setResetSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 pt-safe pb-safe bg-background overflow-auto">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
            <LogoMark className="h-full w-full text-primary p-3" />
          </div>
          <h1 className="text-display-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Loyalink
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'login' ? 'Sign in to your studio' : 'Reset your password'}
          </p>
        </div>

        <div className="rounded-2xl glass-card p-6 mb-6">
          {mode === 'login' ? (
            <>
            <div className="space-y-3">
              <Button
                type="button"
                size="lg"
                className="w-full font-medium h-12 bg-black text-white hover:bg-black/90 active:bg-black/80 border border-black dark:bg-white dark:text-black dark:hover:bg-white/90 dark:active:bg-white/80 dark:border-white"
                onClick={handleAppleSignIn}
                disabled={loading}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  <path d="M17.05 12.536c-.035-3.474 2.836-5.143 2.965-5.222-1.615-2.361-4.13-2.684-5.029-2.72-2.137-.218-4.174 1.261-5.26 1.261-1.087 0-2.758-1.23-4.533-1.196-2.33.034-4.48 1.353-5.678 3.434-2.42 4.196-.619 10.402 1.742 13.807 1.155 1.666 2.527 3.539 4.33 3.47 1.743-.069 2.4-1.125 4.507-1.125 2.107 0 2.696 1.125 4.534 1.09 1.87-.034 3.056-1.697 4.199-3.372 1.322-1.933 1.867-3.802 1.9-3.899-.042-.018-3.644-1.398-3.677-5.528zM14.16 2.438c.96-1.165 1.608-2.78 1.431-4.387-1.382.058-3.057.921-4.049 2.085-.89.97-1.672 2.625-1.462 4.2 1.544.12 3.119-.784 4.08-1.898z" />
                </svg>
                Continue with Apple
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full font-medium h-12"
                onClick={() => signInWithGoogle()}
                disabled={loading}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 h-12"
                  placeholder="you@studio.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setResetSent(false) }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 h-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <Button type="submit" variant="glow" size="lg" className="w-full font-medium" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </Button>
            </form>
            </>
          ) : resetSent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  We sent a reset link to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setMode('login'); setResetSent(false); setError(null) }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 h-12"
                  placeholder="you@studio.com"
                  autoComplete="email"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <Button type="submit" variant="glow" size="lg" className="w-full font-medium" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : 'Send reset link'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null) }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        {mode === 'login' && !onNative && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-foreground hover:underline underline-offset-4">
              Start free trial →
            </Link>
          </p>
        )}
        {mode === 'login' && onNative && (
          <p className="text-center text-sm text-muted-foreground">
            New studios sign up at loyalink.ai
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

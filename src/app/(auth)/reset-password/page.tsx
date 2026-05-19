'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, Mail, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { LogoMark } from '@/components/logo'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const { user, loading: authLoading, updatePassword, resetPasswordForEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isExpired = searchParams.get('expired') === 'true'
  const isRecoveryError = isExpired || searchParams.get('error') === 'auth_callback_failed'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/overview')
  }

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await resetPasswordForEmail(email)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setResendSent(true)
    setLoading(false)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isRecoveryError || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
        </div>

        <div className="relative w-full max-w-sm animate-fade-up text-center">
          {resendSent ? (
            <>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 mb-4 glow-primary">
                <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <h1 className="text-display-xl text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Check your email
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                We sent a fresh password reset link to <span className="text-foreground font-medium">{email}</span>.
              </p>
              <Button asChild variant="outline" size="lg" className="w-full font-medium">
                <Link href="/login">Back to login</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 mb-4 glow-primary">
                {isExpired ? (
                  <RefreshCw className="h-7 w-7 text-primary" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-7 w-7 text-primary" aria-hidden="true" />
                )}
              </div>
              <h1 className="text-display-xl text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {isExpired ? 'Reset link used' : 'Reset link invalid'}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {isExpired
                  ? 'Password reset links can only be used once. Enter your email and we will send a fresh one.'
                  : 'This password reset link is no longer valid. Enter your email and we will send a fresh one.'}
              </p>
              <div className="rounded-2xl glass-card p-6 text-left">
                <form onSubmit={handleResend} className="space-y-4">
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
                      placeholder="you@example.com"
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
                    ) : 'Send new reset link'}
                  </Button>
                </form>
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    For your security, each reset link expires after one use.
                  </p>
                </div>
              </div>
              <Button asChild variant="link" size="sm" className="mt-4 text-muted-foreground">
                <Link href="/login">Back to login</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
            <LogoMark className="h-full w-full p-3 text-primary" />
          </div>
          <h1 className="text-display-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            New password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a new password for your account</p>
        </div>

        <div className="rounded-2xl glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
                New password
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-secondary/50 pl-9"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs text-muted-foreground uppercase tracking-wider">
                Confirm password
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 bg-secondary/50 pl-9"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
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
                  Updating...
                </span>
              ) : 'Set new password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

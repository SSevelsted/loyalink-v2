'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading, updatePassword } = useAuth()
  const router = useRouter()

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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
        </div>

        <div className="relative w-full max-w-sm animate-fade-up text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-display-xl text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Link expired
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            This password reset link has expired or is invalid. Please request a new one.
          </p>
          <Button asChild variant="glow" size="lg" className="w-full font-medium">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
            <span className="text-primary text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>L</span>
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary/50 h-12"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs text-muted-foreground uppercase tracking-wider">
                Confirm password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-secondary/50 h-12"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
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

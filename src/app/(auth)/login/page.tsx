'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signInWithEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signInWithEmail(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const redirect = searchParams.get('redirect') || '/'
    router.push(redirect)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      {/* Subtle radial gradient behind card */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
            <span className="text-primary text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>L</span>
          </div>
          <h1 className="text-display-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Loyalink
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your studio</p>
        </div>

        <div className="rounded-2xl glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary/50 h-12"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button type="submit" variant="glow" size="lg" className="w-full font-medium" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

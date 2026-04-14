'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import type { Invitation, Studio } from '@/types/database'
import { LogoMark } from '@/components/logo'

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [invitation, setInvitation] = useState<(Invitation & { studios: Studio }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, studios(*)')
        .eq('token', params.token)
        .is('accepted_at', null)
        .single()

      if (error || !data) {
        setError('Invalid or expired invitation')
        setLoading(false)
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
        setLoading(false)
        return
      }

      setInvitation(data as Invitation & { studios: Studio })
      setEmail(data.email)
      setLoading(false)
    }
    load()
  }, [params.token, supabase])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setAccepting(true)
    setError(null)

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          email,
          password: user ? undefined : password,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to accept invitation')
      }

      router.push('/overview')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setAccepting(false)
    }
  }

  const shell = (content: React.ReactNode) => (
    <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px]" />
      </div>
      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 glow-primary">
            <LogoMark className="h-full w-full text-primary p-3" />
          </div>
        </div>
        {content}
      </div>
    </div>
  )

  if (loading) {
    return shell(
      <div className="flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !invitation) {
    return shell(
      <div className="rounded-2xl glass-card p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Invalid invitation</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => router.push('/login')} className="mt-2">
          Go to sign in
        </Button>
      </div>
    )
  }

  return shell(
    <>
      <div className="text-center mb-6 -mt-4">
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Join {invitation?.studios?.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          You&apos;ve been invited as <span className="font-medium text-foreground">{invitation?.role}</span>
        </p>
      </div>

      <div className="rounded-2xl glass-card p-6">
        <form onSubmit={handleAccept} className="space-y-4">
          {!user && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  className="bg-secondary/50 h-12"
                  autoComplete="email"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Create password
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
            </>
          )}
          {user && (
            <p className="text-sm text-muted-foreground text-center">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <Button
            type="submit"
            variant="glow"
            size="lg"
            className="w-full font-medium"
            disabled={accepting || (!user && password.length < 8)}
          >
            {accepting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining...
              </span>
            ) : 'Accept invitation'}
          </Button>
        </form>
      </div>
    </>
  )
}

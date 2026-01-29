'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Invitation, Studio } from '@/types/database'

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

  const handleAccept = async () => {
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

      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Join {invitation?.studios?.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited as {invitation?.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleAccept} className="w-full" disabled={accepting}>
            {accepting ? 'Accepting...' : 'Accept Invitation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

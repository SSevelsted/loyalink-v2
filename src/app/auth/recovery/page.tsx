import { KeyRound, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/logo'

type RecoveryPageProps = {
  searchParams: Promise<{
    token_hash?: string
    type?: string
    next?: string
  }>
}

function getSafeRedirect(next: string | undefined): string {
  if (!next) return '/reset-password'
  if (!next.startsWith('/') || next.startsWith('//')) return '/reset-password'
  return next
}

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const params = await searchParams
  const tokenHash = params.token_hash ?? ''
  const type = params.type === 'recovery' ? 'recovery' : ''
  const next = getSafeRedirect(params.next)
  const hasToken = Boolean(tokenHash && type)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 glow-primary">
          <LogoMark className="h-full w-full p-3 text-primary" />
        </div>
        <h1 className="mb-2 text-display-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Reset your password
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Continue to choose a new password for your Loyalink account.
        </p>

        <div className="rounded-2xl glass-card p-6 text-left">
          {hasToken ? (
            <form action="/auth/confirm" method="post" className="space-y-4">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="glow" size="lg" className="w-full font-medium">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Continue
              </Button>
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs leading-5 text-muted-foreground">
                  For your security, this link can only be used once.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                This reset link is missing its secure token. Request a fresh link to continue.
              </p>
              <Button asChild variant="glow" size="lg" className="w-full font-medium">
                <Link href="/reset-password?expired=true">Request new link</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

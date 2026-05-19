import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/logo'

// Intermediate confirmation page for every Supabase OTP email link
// (password reset, signup confirmation, email change).
//
// Email clients (Apple Mail Privacy Protection, Gmail proxy, Outlook Safe
// Links) prefetch every link in a message. Supabase OTP tokens are single
// use, so a link that verifies on load gets its token burned by the
// prefetcher before the user ever clicks. This page does NOTHING on load —
// it only renders a button that POSTs the token to /auth/confirm, so the
// token is spent solely on an explicit user action.

type VerifyType = 'recovery' | 'signup' | 'email_change'

type VerifyPageProps = {
  searchParams: Promise<{
    token_hash?: string
    type?: string
    next?: string
  }>
}

const VERIFY_COPY: Record<
  VerifyType,
  {
    title: string
    body: string
    button: string
    defaultNext: string
    freshLinkHref: string
    freshLinkLabel: string
  }
> = {
  recovery: {
    title: 'Reset your password',
    body: 'Continue to choose a new password for your Loyalink account.',
    button: 'Continue',
    defaultNext: '/reset-password',
    freshLinkHref: '/reset-password?expired=true',
    freshLinkLabel: 'Request new link',
  },
  signup: {
    title: 'Confirm your email',
    body: 'Confirm your email address to finish setting up your Loyalink account.',
    button: 'Confirm email',
    defaultNext: '/overview',
    freshLinkHref: '/login',
    freshLinkLabel: 'Back to login',
  },
  email_change: {
    title: 'Confirm your new email',
    body: 'Confirm this is the new email address for your Loyalink account.',
    button: 'Confirm email',
    defaultNext: '/settings',
    freshLinkHref: '/login',
    freshLinkLabel: 'Back to login',
  },
}

function isVerifyType(type: string | undefined): type is VerifyType {
  return type === 'recovery' || type === 'signup' || type === 'email_change'
}

function getSafeRedirect(next: string | undefined, fallback: string): string {
  if (!next) return fallback
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams
  const tokenHash = params.token_hash ?? ''
  const type = isVerifyType(params.type) ? params.type : null
  const copy = type ? VERIFY_COPY[type] : null
  const next = getSafeRedirect(params.next, copy?.defaultNext ?? '/overview')
  const hasToken = Boolean(tokenHash && type && copy)

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
          {copy?.title ?? 'Verify your link'}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {copy?.body ?? 'Continue to verify your Loyalink account.'}
        </p>

        <div className="rounded-2xl glass-card p-6 text-left">
          {hasToken && copy && type ? (
            <form action="/auth/confirm" method="post" className="space-y-4">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="glow" size="lg" className="w-full font-medium">
                {type === 'recovery' ? (
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <MailCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {copy.button}
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
                This link is missing its secure token or has an unrecognized type. Request a
                fresh one to continue.
              </p>
              <Button asChild variant="glow" size="lg" className="w-full font-medium">
                <Link href={copy?.freshLinkHref ?? '/login'}>
                  {copy?.freshLinkLabel ?? 'Back to login'}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

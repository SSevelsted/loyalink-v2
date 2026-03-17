import Link from 'next/link'
import { LogoMark } from '@/components/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-6">
      <div className="h-14 w-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
        <LogoMark className="h-full w-full text-primary p-2" />
      </div>
      <div className="space-y-2">
        <h1
          className="text-5xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          404
        </h1>
        <p className="text-muted-foreground">This page doesn&apos;t exist.</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
        <Button asChild>
          <Link href="/overview">Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

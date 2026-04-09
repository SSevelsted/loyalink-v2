'use client'

import { useStudio } from '@/hooks/use-studio'
import { Card, CardContent } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import { MARKETING_URL } from '@/lib/constants'

export default function EmbedWallet() {
  const { currentStudio } = useStudio()

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Wallet & Landing Page</h1>

      <Card className="glass-card">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-medium text-foreground">Join Link</h3>
            <p className="text-sm text-muted-foreground mt-1">Share this link with customers to join your loyalty program:</p>
            <a
              href={`${MARKETING_URL}/join/${currentStudio?.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
            >
              {MARKETING_URL}/join/{currentStudio?.slug}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              To customize your wallet card design, landing page, and brand colors, visit the full Loyalink dashboard at{' '}
              <a href="https://my.loyalink.ai/wallet" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                my.loyalink.ai
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

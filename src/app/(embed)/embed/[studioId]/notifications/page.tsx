'use client'

import { Card, CardContent } from '@/components/ui/card'

export default function EmbedNotifications() {
  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Notifications</h1>

      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Push notification campaigns and automations are managed in the full Loyalink dashboard at{' '}
            <a href="https://my.loyalink.ai/notifications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              my.loyalink.ai
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

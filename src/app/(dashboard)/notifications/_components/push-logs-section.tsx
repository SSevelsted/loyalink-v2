'use client'

import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'
import { usePushLogs } from '@/hooks/use-wallet'

export function PushLogsSection() {
  const { data: pushLogs } = usePushLogs()

  return (
    <div className="space-y-4">
      {!pushLogs?.length ? (
        <div className="py-20 text-center">
          <Send className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No push logs</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pushLogs.map(log => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-xl border border-border/30 px-4 py-3 hover:bg-card/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Send className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {log.target_type} push
                    {log.campaign_id && (
                      <span className="text-xs text-primary ml-2">Campaign</span>
                    )}
                    {log.automation_id && (
                      <span className="text-xs text-amber-400 ml-2">Automation</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {log.sent_count}/{log.total_devices}
                </span>
                <Badge
                  variant="outline"
                  className={
                    log.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : log.status === 'failed'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }
                >
                  {log.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

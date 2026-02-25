'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Plus, Megaphone, Send, Trash2, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { useCampaigns, useSendCampaign, useDeleteCampaign, useUpdateCampaign } from '@/hooks/use-notifications'
import { CampaignBuilder } from './campaign-builder'
import type { PushCampaign } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-secondary text-muted-foreground border-border/30',
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-secondary text-muted-foreground border-border/30',
}

function audienceLabel(campaign: PushCampaign): string {
  if (campaign.audience_type === 'all') return 'All customers'
  if (campaign.audience_type === 'customers') {
    const count = campaign.audience_filter?.customer_ids?.length ?? 0
    return `${count} customer${count !== 1 ? 's' : ''}`
  }
  const parts: string[] = []
  if (campaign.audience_filter?.loyalty_stages?.length) {
    parts.push(campaign.audience_filter.loyalty_stages.join(', '))
  }
  if (campaign.audience_filter?.tags?.length) {
    parts.push(campaign.audience_filter.tags.join(', '))
  }
  return parts.length ? parts.join(' + ') : 'Segment'
}

export function CampaignsSection() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<PushCampaign | null>(null)

  const { data: campaigns, isLoading } = useCampaigns(statusFilter === 'all' ? undefined : statusFilter)
  const sendCampaign = useSendCampaign()
  const deleteCampaign = useDeleteCampaign()
  const updateCampaign = useUpdateCampaign()

  const handleSend = async (id: string) => {
    try {
      await sendCampaign.mutateAsync(id)
      toast.success('Campaign sent')
      setSelectedCampaign(null)
    } catch {
      toast.error('Failed to send')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await updateCampaign.mutateAsync({ id, status: 'cancelled' })
      toast.success('Campaign cancelled')
      setSelectedCampaign(null)
    } catch {
      toast.error('Failed to cancel')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign.mutateAsync(id)
      toast.success('Campaign deleted')
      setSelectedCampaign(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="glow" onClick={() => setBuilderOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>

        {/* Campaign list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : !campaigns?.length ? (
          <div className="py-20 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first push campaign</p>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map(campaign => (
              <Card
                key={campaign.id}
                variant="glass"
                className="rounded-xl cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{campaign.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{audienceLabel(campaign)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {campaign.status === 'completed' && (
                      <span className="text-xs text-muted-foreground">
                        {campaign.sent_count}/{campaign.audience_count}
                      </span>
                    )}
                    <Badge variant="outline" className={STATUS_COLORS[campaign.status] ?? ''}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CampaignBuilder open={builderOpen} onOpenChange={setBuilderOpen} />

      {/* Campaign detail sheet */}
      <Sheet open={!!selectedCampaign} onOpenChange={open => !open && setSelectedCampaign(null)}>
        <SheetContent>
          {selectedCampaign && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCampaign.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={`mt-1 ${STATUS_COLORS[selectedCampaign.status] ?? ''}`}>
                      {selectedCampaign.status}
                    </Badge>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Audience</p>
                    <p className="text-sm font-medium mt-1">{audienceLabel(selectedCampaign)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Sent</p>
                    <p className="text-sm font-medium mt-1">{selectedCampaign.sent_count}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="text-sm font-medium mt-1">{selectedCampaign.failed_count}</p>
                  </div>
                </div>

                {selectedCampaign.scheduled_at && (
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Scheduled For</p>
                    <p className="text-sm font-medium mt-1">
                      {new Date(selectedCampaign.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedCampaign.sent_at && (
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Sent At</p>
                    <p className="text-sm font-medium mt-1">
                      {new Date(selectedCampaign.sent_at).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4">
                  {(selectedCampaign.status === 'draft' || selectedCampaign.status === 'scheduled') && (
                    <Button
                      variant="glow"
                      onClick={() => handleSend(selectedCampaign.id)}
                      disabled={sendCampaign.isPending}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {sendCampaign.isPending ? 'Sending...' : 'Send Now'}
                    </Button>
                  )}
                  {selectedCampaign.status === 'scheduled' && (
                    <Button
                      variant="outline"
                      onClick={() => handleCancel(selectedCampaign.id)}
                      disabled={updateCampaign.isPending}
                      className="gap-2"
                    >
                      <Ban className="h-4 w-4" />
                      Cancel Schedule
                    </Button>
                  )}
                  {(selectedCampaign.status === 'draft' || selectedCampaign.status === 'cancelled') && (
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(selectedCampaign.id)}
                      disabled={deleteCampaign.isPending}
                      className="gap-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

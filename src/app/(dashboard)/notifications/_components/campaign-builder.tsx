'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, Filter, UserCheck, Send, Clock, Smartphone, Mail, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateCampaign, useSendCampaign, useAudienceCount } from '@/hooks/use-notifications'
import { useCustomers } from '@/hooks/use-customers'
import { AudienceFilterForm } from './audience-filter-form'
import { ContentActionForm, type ContentAction } from './content-action-form'
import type { AudienceFilter } from '@/types/database'
import { cn } from '@/lib/utils'

interface CampaignBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AudienceType = 'all' | 'segment' | 'customers'
type ScheduleType = 'now' | 'later'

export function CampaignBuilder({ open, onOpenChange }: CampaignBuilderProps) {
  const [name, setName] = useState('')
  const [audienceType, setAudienceType] = useState<AudienceType>('all')
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({})
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([])
  const [content, setContent] = useState<ContentAction>({ action: 'none' })
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  const createCampaign = useCreateCampaign()
  const sendCampaign = useSendCampaign()
  const audienceCount = useAudienceCount()
  const { data: customers } = useCustomers(customerSearch)

  // Debounced audience count
  useEffect(() => {
    if (!open) return
    const filter: AudienceFilter = audienceType === 'customers'
      ? { customer_ids: selectedCustomerIds }
      : audienceFilter
    const timeout = setTimeout(() => {
      audienceCount.mutate({ audienceType, audienceFilter: filter })
    }, 500)
    return () => clearTimeout(timeout)
  }, [audienceType, audienceFilter, selectedCustomerIds, open])

  const reset = useCallback(() => {
    setName('')
    setAudienceType('all')
    setAudienceFilter({})
    setSelectedCustomerIds([])
    setContent({ action: 'none' })
    setScheduleType('now')
    setScheduledAt('')
    setCustomerSearch('')
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) reset()
  }, [open, reset])

  const buildPayload = () => ({
    name,
    audienceType,
    audienceFilter: audienceType === 'customers' ? { customer_ids: selectedCustomerIds } : audienceFilter,
    content: content as Record<string, unknown>,
  })

  const handleSaveDraft = async () => {
    if (!name.trim()) { toast.error('Campaign name is required'); return }
    if (!content.announcement?.trim()) { toast.error('Announcement text is required'); return }
    try {
      await createCampaign.mutateAsync(buildPayload())
      toast.success('Draft saved')
      onOpenChange(false)
    } catch {
      toast.error('Failed to save draft')
    }
  }

  const handleSchedule = async () => {
    if (!name.trim()) { toast.error('Campaign name is required'); return }
    if (!content.announcement?.trim()) { toast.error('Announcement text is required'); return }
    if (!scheduledAt) { toast.error('Select a date and time'); return }
    try {
      await createCampaign.mutateAsync({ ...buildPayload(), scheduledAt: new Date(scheduledAt).toISOString() })
      toast.success('Campaign scheduled')
      onOpenChange(false)
    } catch {
      toast.error('Failed to schedule campaign')
    }
  }

  const handleSendNow = async () => {
    if (!name.trim()) { toast.error('Campaign name is required'); return }
    if (!content.announcement?.trim()) { toast.error('Announcement text is required'); return }
    try {
      const campaign = await createCampaign.mutateAsync(buildPayload())
      await sendCampaign.mutateAsync(campaign.id)
      toast.success('Campaign sent')
      onOpenChange(false)
    } catch {
      toast.error('Failed to send campaign')
    }
  }

  const isPending = createCampaign.isPending || sendCampaign.isPending

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input
              placeholder="e.g. February update"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Channel</Label>
            <div className="grid grid-cols-3 gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                <Smartphone className="h-4 w-4" />
                Pass Update
              </button>
              <button disabled className="flex items-center gap-2 rounded-lg border border-border/30 px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                <MessageSquare className="h-4 w-4" />
                SMS
                <Badge variant="outline" className="text-[10px] ml-auto">Soon</Badge>
              </button>
              <button disabled className="flex items-center gap-2 rounded-lg border border-border/30 px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                <Mail className="h-4 w-4" />
                Email
                <Badge variant="outline" className="text-[10px] ml-auto">Soon</Badge>
              </button>
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Audience</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all' as const, label: 'All Customers', icon: Users },
                { id: 'segment' as const, label: 'By Segment', icon: Filter },
                { id: 'customers' as const, label: 'Specific', icon: UserCheck },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAudienceType(opt.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors',
                    audienceType === opt.id
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>

            {audienceType === 'segment' && (
              <AudienceFilterForm value={audienceFilter} onChange={setAudienceFilter} />
            )}

            {audienceType === 'customers' && (
              <div className="space-y-2">
                <Input
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border/30 p-2">
                  {customers?.slice(0, 20).map(c => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="rounded"
                      />
                      <span className="truncate">{c.name}</span>
                      {c.email && <span className="text-xs text-muted-foreground ml-auto truncate">{c.email}</span>}
                    </label>
                  ))}
                  {!customers?.length && (
                    <p className="text-xs text-muted-foreground text-center py-2">No customers found</p>
                  )}
                </div>
                {selectedCustomerIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedCustomerIds.length} selected</p>
                )}
              </div>
            )}
          </div>

          {/* Audience count */}
          <div className="rounded-lg bg-secondary/50 border border-border/30 px-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will reach{' '}
              <span className="font-medium text-foreground">
                ~{audienceCount.data?.count ?? '...'}
              </span>{' '}
              customers
            </p>
          </div>

          {/* Content & Action */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Content & Action</Label>
            <ContentActionForm value={content} onChange={setContent} />
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Schedule</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setScheduleType('now')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  scheduleType === 'now'
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Send className="h-4 w-4" />
                Send Now
              </button>
              <button
                onClick={() => setScheduleType('later')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  scheduleType === 'later'
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Clock className="h-4 w-4" />
                Schedule
              </button>
            </div>
            {scheduleType === 'later' && (
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isPending} className="flex-1">
              Save Draft
            </Button>
            {scheduleType === 'later' ? (
              <Button variant="glow" onClick={handleSchedule} disabled={isPending} className="flex-1 gap-2">
                <Clock className="h-4 w-4" />
                {createCampaign.isPending ? 'Scheduling...' : 'Schedule'}
              </Button>
            ) : (
              <Button variant="glow" onClick={handleSendNow} disabled={isPending} className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                {isPending ? 'Sending...' : 'Send Now'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

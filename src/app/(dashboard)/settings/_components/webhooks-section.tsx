'use client'

import { useState } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Webhook, Copy, Check, Trash2, Plus, AlertTriangle, Pause, Play, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/webhook-events'

type WebhookRow = {
  id: string
  url: string
  events: string[]
  active: boolean
  created_at: string
  updated_at: string
}

type DeliveryRow = {
  id: string
  event: string
  status_code: number | null
  success: boolean
  attempt: number
  created_at: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function WebhooksSection() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookRow | null>(null)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([])
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: webhooks = [], isLoading } = useQuery<WebhookRow[]>({
    queryKey: ['webhooks', currentStudio?.id],
    queryFn: async () => {
      const res = await fetch(`/api/settings/webhooks?studioId=${currentStudio!.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    enabled: !!currentStudio,
  })

  const { data: deliveries = [] } = useQuery<DeliveryRow[]>({
    queryKey: ['webhook-deliveries', expandedId],
    queryFn: async () => {
      const res = await fetch(`/api/settings/webhooks/${expandedId}/deliveries?studioId=${currentStudio!.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    enabled: !!expandedId && !!currentStudio,
  })

  const createWebhook = useMutation({
    mutationFn: async ({ url, events }: { url: string; events: WebhookEvent[] }) => {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, url, events }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create')
      }
      return res.json()
    },
    onSuccess: (data) => {
      setCreatedSecret(data.secret)
      setNewUrl('')
      setSelectedEvents([])
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const updateWebhook = useMutation({
    mutationFn: async ({ id, url, events }: { id: string; url: string; events: WebhookEvent[] }) => {
      const res = await fetch(`/api/settings/webhooks/${id}?studioId=${currentStudio!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook updated')
      setCreateOpen(false)
      setEditingWebhook(null)
      setCreatedSecret(null)
      setNewUrl('')
      setSelectedEvents([])
      setCopied(false)
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const toggleWebhook = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/settings/webhooks/${id}?studioId=${currentStudio!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error('Failed to update')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: () => toast.error('Failed to update webhook'),
  })

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/webhooks/${id}?studioId=${currentStudio!.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      toast.success('Webhook deleted')
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: () => toast.error('Failed to delete webhook'),
  })

  const handleCopy = async () => {
    if (!createdSecret) return
    await navigator.clipboard.writeText(createdSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCloseCreate = () => {
    setCreateOpen(false)
    setEditingWebhook(null)
    setCreatedSecret(null)
    setNewUrl('')
    setSelectedEvents([])
    setCopied(false)
  }

  const handleOpenCreate = () => {
    setEditingWebhook(null)
    setCreatedSecret(null)
    setNewUrl('')
    setSelectedEvents([])
    setCopied(false)
    setCreateOpen(true)
  }

  const handleOpenEdit = (webhook: WebhookRow) => {
    setEditingWebhook(webhook)
    setCreatedSecret(null)
    setNewUrl(webhook.url)
    setSelectedEvents(
      webhook.events.filter((event): event is WebhookEvent =>
        WEBHOOK_EVENTS.some((option) => option.value === event),
      ),
    )
    setCopied(false)
    setCreateOpen(true)
  }

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  let submitLabel = 'Create Webhook'
  if (editingWebhook) {
    submitLabel = updateWebhook.isPending ? 'Saving...' : 'Save Changes'
  } else if (createWebhook.isPending) {
    submitLabel = 'Creating...'
  }

  let dialogTitle = 'Add Webhook'
  if (createdSecret) {
    dialogTitle = 'Webhook Created'
  } else if (editingWebhook) {
    dialogTitle = 'Edit Webhook'
  }

  let dialogDescription = 'Enter a HTTPS endpoint URL. We\'ll sign each request so you can verify it\'s from Loyalink.'
  if (createdSecret) {
    dialogDescription = 'Copy this signing secret now. You will not be able to see it again.'
  } else if (editingWebhook) {
    dialogDescription = 'Update the endpoint URL or event filters for this webhook.'
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Webhooks</CardTitle>
          </div>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Webhook
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Receive real-time notifications when events happen in your loyalty program. We&apos;ll send a POST request to your URL with the event data.
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No webhooks configured</p>
          ) : (
            <div className="space-y-2">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-lg border border-border">
                  <div className="flex items-center justify-between p-3">
                    <button
                      onClick={() => setExpandedId(expandedId === webhook.id ? null : webhook.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      {expandedId === webhook.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{webhook.url}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={webhook.active ? 'default' : 'secondary'} className="text-xs">
                            {webhook.active ? 'Active' : 'Paused'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {webhook.events.length === 0
                              ? 'All events'
                              : `${webhook.events.length} event${webhook.events.length === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(webhook)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWebhook.mutate({ id: webhook.id, active: !webhook.active })}
                        disabled={toggleWebhook.isPending}
                        title={webhook.active ? 'Pause' : 'Resume'}
                      >
                        {webhook.active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWebhook.mutate(webhook.id)}
                        disabled={deleteWebhook.isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedId === webhook.id && (
                    <div className="border-t border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Deliveries</p>
                      {deliveries.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No deliveries yet</p>
                      ) : (
                        <div className="space-y-1">
                          {deliveries.map((d) => (
                            <div key={d.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-secondary/30">
                              <div className="flex items-center gap-2">
                                <span className={d.success ? 'text-emerald-400' : 'text-red-400'}>
                                  {d.status_code ?? 'ERR'}
                                </span>
                                <span className="text-foreground">{d.event}</span>
                                {d.attempt > 1 && (
                                  <span className="text-muted-foreground">(retry #{d.attempt})</span>
                                )}
                              </div>
                              <span className="text-muted-foreground">{timeAgo(d.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={handleCloseCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {createdSecret ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  This is the only time the signing secret will be shown. For n8n Header Auth, use header name
                  {' '}<span className="font-mono text-foreground">X-Loyalink-Webhook-Secret</span> and this value.
                </p>
              </div>

              <div className="relative">
                <code className="block w-full rounded-lg bg-secondary border border-border p-3 text-xs font-mono text-foreground break-all pr-10">
                  {createdSecret}
                </code>
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-2 p-1.5 rounded-md hover:bg-secondary-foreground/10"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>

              <Button onClick={handleCloseCreate} className="w-full">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://api.example.com/webhooks/loyalink"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <Label className="mb-2 block">Events</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select which events to receive. Leave empty for all events.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {WEBHOOK_EVENTS.map((evt) => {
                    const selected = selectedEvents.includes(evt.value)
                    return (
                      <button
                        key={evt.value}
                        onClick={() => toggleEvent(evt.value)}
                        className={`text-left text-xs rounded-lg border px-3 py-2 transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                        }`}
                      >
                        {evt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button
                onClick={() => {
                  if (editingWebhook) {
                    updateWebhook.mutate({ id: editingWebhook.id, url: newUrl, events: selectedEvents })
                    return
                  }
                  createWebhook.mutate({ url: newUrl, events: selectedEvents })
                }}
                disabled={createWebhook.isPending || updateWebhook.isPending || !newUrl.trim()}
                className="w-full"
              >
                {submitLabel}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

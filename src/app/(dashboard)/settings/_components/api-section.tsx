'use client'

import { useState } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Key, Copy, Check, Trash2, Plus, AlertTriangle } from 'lucide-react'

type ApiKeyRow = {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
}

export function ApiSection() {
  const { currentStudio } = useStudio()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: keys = [], isLoading } = useQuery<ApiKeyRow[]>({
    queryKey: ['api-keys', currentStudio?.id],
    queryFn: async () => {
      const res = await fetch(`/api/settings/api-keys?studioId=${currentStudio!.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    enabled: !!currentStudio,
  })

  const createKey = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: currentStudio!.id, name }),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: (data) => {
      setCreatedKey(data.key)
      setNewKeyName('')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => toast.error('Failed to create API key'),
  })

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/api-keys/${id}?studioId=${currentStudio!.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to revoke')
    },
    onSuccess: () => {
      toast.success('API key revoked')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => toast.error('Failed to revoke key'),
  })

  const handleCopy = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCloseCreate = () => {
    setCreateOpen(false)
    setCreatedKey(null)
    setNewKeyName('')
    setCopied(false)
  }

  const timeAgo = (date: string | null) => {
    if (!date) return 'Never'
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">API Keys</CardTitle>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Key
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            API keys allow external platforms to interact with your loyalty program. Keep them secret.
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No API keys yet</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{key.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(key.created_at).toLocaleDateString()} &middot; Last used {timeAgo(key.last_used_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeKey.mutate(key.id)}
                    disabled={revokeKey.isPending}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={handleCloseCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdKey ? 'API Key Created' : 'Create API Key'}</DialogTitle>
            <DialogDescription>
              {createdKey
                ? 'Copy this key now. You will not be able to see it again.'
                : 'Give your API key a name to help you identify it later.'}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-muted-foreground">This is the only time this key will be shown</p>
              </div>

              <div className="relative">
                <code className="block w-full rounded-lg bg-secondary border border-border p-3 text-xs font-mono text-foreground break-all pr-10">
                  {createdKey}
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
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. StreamInk Production"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                onClick={() => createKey.mutate(newKeyName || 'Default')}
                disabled={createKey.isPending}
                className="w-full"
              >
                {createKey.isPending ? 'Creating...' : 'Create API Key'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

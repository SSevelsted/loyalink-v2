'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar, Clock, Cake, TrendingUp, Award, Tag, Zap, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateAutomation, useUpdateAutomation } from '@/hooks/use-notifications'
import { AudienceFilterForm } from './audience-filter-form'
import { ContentActionForm, type ContentAction } from './content-action-form'
import type { AudienceFilter, AutomationTriggerType, PushAutomation } from '@/types/database'
import { cn } from '@/lib/utils'

interface AutomationBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: PushAutomation | null
}

const TRIGGER_TYPES: Array<{
  id: AutomationTriggerType
  label: string
  description: string
  icon: typeof Calendar
}> = [
  { id: 'days_since_join', label: 'Days Since Join', description: 'Trigger after N days from signup', icon: Calendar },
  { id: 'days_inactive', label: 'Days Inactive', description: 'Trigger after N days without activity', icon: Clock },
  { id: 'birthday', label: 'Birthday', description: 'Trigger on/before customer birthday', icon: Cake },
  { id: 'balance_threshold', label: 'Balance Threshold', description: 'When balance crosses a threshold', icon: TrendingUp },
  { id: 'tier_change', label: 'Tier Change', description: 'When customer changes tier', icon: Award },
  { id: 'tag_added', label: 'Tag Added', description: 'When a specific tag is added', icon: Tag },
]

export function AutomationBuilder({ open, onOpenChange, editing }: AutomationBuilderProps) {
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<AutomationTriggerType | null>(null)
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({})
  const [content, setContent] = useState<ContentAction>({ action: 'none' })
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({})
  const [showAudienceFilter, setShowAudienceFilter] = useState(false)

  const createAutomation = useCreateAutomation()
  const updateAutomation = useUpdateAutomation()

  const isEditing = !!editing

  // Populate fields when editing
  useEffect(() => {
    if (open && editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editing.name)
      setTriggerType(editing.trigger_type)
      setTriggerConfig(editing.trigger_config)
      const c = editing.content as ContentAction | null
      setContent(c && c.action ? c : { action: 'none' })
      const af = editing.audience_filter
      const hasFilter = af && Object.keys(af).length > 0
      setAudienceFilter(af || {})
      setShowAudienceFilter(!!hasFilter)
    }
  }, [open, editing])

  const reset = useCallback(() => {
    setName('')
    setTriggerType(null)
    setTriggerConfig({})
    setContent({ action: 'none' })
    setAudienceFilter({})
    setShowAudienceFilter(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) reset()
  }, [open, reset])

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!triggerType) { toast.error('Select a trigger'); return }
    if (!content.announcement?.trim()) { toast.error('Announcement text is required'); return }
    try {
      await createAutomation.mutateAsync({
        name,
        triggerType,
        triggerConfig,
        content: content as Record<string, unknown>,
        audienceFilter: showAudienceFilter ? audienceFilter : undefined,
      })
      toast.success('Automation created')
      onOpenChange(false)
    } catch {
      toast.error('Failed to create automation')
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!triggerType) { toast.error('Select a trigger'); return }
    if (!content.announcement?.trim()) { toast.error('Announcement text is required'); return }
    try {
      await updateAutomation.mutateAsync({
        id: editing.id,
        name,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        content: content as Record<string, unknown>,
        audience_filter: showAudienceFilter ? audienceFilter : {},
      })
      toast.success('Automation updated')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update automation')
    }
  }

  const isPending = createAutomation.isPending || updateAutomation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Automation' : 'New Automation'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label>Automation Name</Label>
            <Input
              placeholder="e.g. Welcome message after 7 days"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Trigger type */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Trigger Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {TRIGGER_TYPES.map(trigger => {
                const Icon = trigger.icon
                const selected = triggerType === trigger.id
                return (
                  <button
                    key={trigger.id}
                    onClick={() => { setTriggerType(trigger.id); if (!isEditing || trigger.id !== editing?.trigger_type) setTriggerConfig({}) }}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/30 hover:bg-secondary/50'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <p className={cn('text-sm font-medium', selected ? 'text-primary' : 'text-foreground')}>{trigger.label}</p>
                      <p className="text-xs text-muted-foreground">{trigger.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Trigger config */}
          {triggerType === 'days_since_join' && (
            <div className="space-y-2">
              <Label>Days after signup</Label>
              <Input
                type="number"
                min={1}
                placeholder="30"
                value={(triggerConfig.days as number) ?? ''}
                onChange={e => setTriggerConfig({ days: Number(e.target.value) })}
              />
            </div>
          )}

          {triggerType === 'days_inactive' && (
            <div className="space-y-2">
              <Label>Days of inactivity</Label>
              <Input
                type="number"
                min={1}
                placeholder="14"
                value={(triggerConfig.days as number) ?? ''}
                onChange={e => setTriggerConfig({ days: Number(e.target.value) })}
              />
            </div>
          )}

          {triggerType === 'birthday' && (
            <div className="space-y-2">
              <Label>Days before birthday (0 = on the day)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={(triggerConfig.days_before as number) ?? ''}
                onChange={e => setTriggerConfig({ days_before: Number(e.target.value) })}
              />
            </div>
          )}

          {triggerType === 'balance_threshold' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Balance</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={(triggerConfig.min_balance as number) ?? ''}
                  onChange={e => setTriggerConfig(prev => ({ ...prev, min_balance: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="flex gap-2">
                  {['above', 'below'].map(dir => (
                    <button
                      key={dir}
                      onClick={() => setTriggerConfig(prev => ({ ...prev, direction: dir }))}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        triggerConfig.direction === dir
                          ? 'border-primary/30 bg-primary/5 text-primary'
                          : 'border-border/30 text-muted-foreground'
                      )}
                    >
                      {dir.charAt(0).toUpperCase() + dir.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {triggerType === 'tier_change' && (
            <div className="space-y-2">
              <Label>To tier (slug)</Label>
              <Input
                placeholder="gold"
                value={(triggerConfig.to_tier as string) ?? ''}
                onChange={e => setTriggerConfig({ to_tier: e.target.value })}
              />
            </div>
          )}

          {triggerType === 'tag_added' && (
            <div className="space-y-2">
              <Label>Tag</Label>
              <Input
                placeholder="vip"
                value={(triggerConfig.tag as string) ?? ''}
                onChange={e => setTriggerConfig({ tag: e.target.value })}
              />
            </div>
          )}

          {/* Content & Action */}
          {triggerType && (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Content & Action</Label>
              <ContentActionForm value={content} onChange={setContent} />
            </div>
          )}

          {/* Optional audience filter */}
          {triggerType && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAudienceFilter}
                  onChange={e => setShowAudienceFilter(e.target.checked)}
                  className="rounded"
                />
                Additional audience filter
              </label>
              {showAudienceFilter && (
                <AudienceFilterForm value={audienceFilter} onChange={setAudienceFilter} />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            {isEditing ? (
              <Button
                variant="glow"
                onClick={handleUpdate}
                disabled={isPending}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" />
                {updateAutomation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            ) : (
              <Button
                variant="glow"
                onClick={handleCreate}
                disabled={isPending}
                className="flex-1 gap-2"
              >
                <Zap className="h-4 w-4" />
                {createAutomation.isPending ? 'Creating...' : 'Create Automation'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

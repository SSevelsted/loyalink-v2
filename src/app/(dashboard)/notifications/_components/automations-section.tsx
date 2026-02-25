'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Plus, Zap, Trash2, Pencil, Calendar, Clock, Cake, TrendingUp, Award, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useAutomations, useUpdateAutomation, useDeleteAutomation } from '@/hooks/use-notifications'
import { AutomationBuilder } from './automation-builder'
import type { AutomationTriggerType, PushAutomation } from '@/types/database'

const TRIGGER_ICONS: Record<AutomationTriggerType, typeof Calendar> = {
  days_since_join: Calendar,
  days_inactive: Clock,
  birthday: Cake,
  balance_threshold: TrendingUp,
  tier_change: Award,
  tag_added: Tag,
}

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  days_since_join: 'Days Since Join',
  days_inactive: 'Days Inactive',
  birthday: 'Birthday',
  balance_threshold: 'Balance Threshold',
  tier_change: 'Tier Change',
  tag_added: 'Tag Added',
}

function triggerDescription(type: AutomationTriggerType, config: Record<string, unknown>): string {
  switch (type) {
    case 'days_since_join': return `After ${config.days ?? 30} days`
    case 'days_inactive': return `${config.days ?? 14} days inactive`
    case 'birthday': {
      const days = config.days_before as number ?? 0
      return days === 0 ? 'On the day' : `${days} day${days !== 1 ? 's' : ''} before`
    }
    case 'balance_threshold': return `Balance ${config.direction ?? 'above'} ${config.min_balance ?? 0}`
    case 'tier_change': return `To ${config.to_tier ?? 'any'}`
    case 'tag_added': return `Tag: ${config.tag ?? 'any'}`
    default: return type
  }
}

function actionLabel(content: Record<string, unknown> | null): string | null {
  if (!content || !content.action || content.action === 'none') return null
  if (content.action === 'add_balance') return `+${content.amount ?? 0} balance`
  if (content.action === 'cashback_boost') return `+${content.cashback_rate ?? 0}% for ${content.cashback_duration_days ?? 30}d`
  return null
}

export function AutomationsSection() {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<PushAutomation | null>(null)

  const { data: automations, isLoading } = useAutomations()
  const updateAutomation = useUpdateAutomation()
  const deleteAutomation = useDeleteAutomation()

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await updateAutomation.mutateAsync({ id, is_enabled: enabled })
      toast.success(enabled ? 'Automation enabled' : 'Automation disabled')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await deleteAutomation.mutateAsync(id)
      toast.success('Automation deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleEdit = (automation: PushAutomation) => {
    setEditingAutomation(automation)
    setBuilderOpen(true)
  }

  const handleBuilderClose = (open: boolean) => {
    setBuilderOpen(open)
    if (!open) setEditingAutomation(null)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button variant="glow" onClick={() => { setEditingAutomation(null); setBuilderOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" />
            New Automation
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : !automations?.length ? (
          <div className="py-20 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No automations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Set up triggers to automatically push updates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {automations.map(automation => {
              const TriggerIcon = TRIGGER_ICONS[automation.trigger_type] ?? Zap
              const action = actionLabel(automation.content as Record<string, unknown>)
              return (
                <Card
                  key={automation.id}
                  variant="glass"
                  className="rounded-xl cursor-pointer hover:bg-card/80 transition-colors"
                  onClick={() => handleEdit(automation)}
                >
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <TriggerIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{automation.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {TRIGGER_LABELS[automation.trigger_type] ?? automation.trigger_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {triggerDescription(automation.trigger_type, automation.trigger_config)}
                          </span>
                          {action && (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              {action}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {automation.run_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {automation.run_count} run{automation.run_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {automation.last_run_at && (
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          Last: {new Date(automation.last_run_at).toLocaleDateString()}
                        </span>
                      )}
                      <div onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={automation.is_enabled}
                          onCheckedChange={checked => handleToggle(automation.id, checked)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); handleEdit(automation) }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => handleDelete(e, automation.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <AutomationBuilder open={builderOpen} onOpenChange={handleBuilderClose} editing={editingAutomation} />
    </>
  )
}

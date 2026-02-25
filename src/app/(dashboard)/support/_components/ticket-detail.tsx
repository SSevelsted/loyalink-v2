'use client'

import { useState, useEffect } from 'react'
import { useTicketMessages, useAddMessage, useUpdateTicket, type EnrichedMessage } from '@/hooks/use-support'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { SupportTicket, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from '@/types/database'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Pencil, Check, X, CheckCircle2 } from 'lucide-react'
import { timeAgo, statusLabel, statusColor, priorityColor, categoryLabel } from './shared'

const STATUS_STEPS: { key: SupportTicketStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting_on_customer', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
]

const CATEGORIES = [
  { value: 'question', label: 'Question' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'billing', label: 'Billing' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

type Props = {
  ticket: SupportTicket | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (ticket: SupportTicket) => void
}

export function TicketDetail({ ticket, open, onOpenChange, onUpdate }: Props) {
  const { user } = useAuth()
  const updateTicket = useUpdateTicket()
  const addMessage = useAddMessage()

  // Local ticket state so updates reflect immediately
  const [localTicket, setLocalTicket] = useState<SupportTicket | null>(ticket)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ticket) setLocalTicket(ticket)
  }, [ticket])

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<SupportTicketCategory>('question')
  const [editPriority, setEditPriority] = useState<SupportTicketPriority>('medium')

  // Reply
  const [reply, setReply] = useState('')

  const { data: messages, isLoading: messagesLoading } = useTicketMessages(localTicket?.id ?? null)

  const startEdit = () => {
    if (!localTicket) return
    setEditTitle(localTicket.title)
    setEditDescription(localTicket.description)
    setEditCategory(localTicket.category)
    setEditPriority(localTicket.priority)
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const handleSave = async () => {
    if (!localTicket) return
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error('Title and description are required')
      return
    }
    try {
      const updated = await updateTicket.mutateAsync({
        id: localTicket.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        priority: editPriority,
      })
      setLocalTicket(updated)
      onUpdate?.(updated)
      setEditing(false)
      toast.success('Ticket updated')
    } catch {
      toast.error('Failed to update ticket')
    }
  }

  const handleSend = async () => {
    if (!reply.trim() || !localTicket) return
    try {
      await addMessage.mutateAsync({ ticketId: localTicket.id, message: reply.trim() })
      setReply('')
    } catch {
      toast.error('Failed to send message')
    }
  }

  const handleClose = async () => {
    if (!localTicket) return
    try {
      const updated = await updateTicket.mutateAsync({ id: localTicket.id, status: 'closed' })
      setLocalTicket(updated)
      onUpdate?.(updated)
      toast.success('Ticket closed')
    } catch {
      toast.error('Failed to close ticket')
    }
  }

  if (!localTicket) return null

  const isClosed = localTicket.status === 'closed' || localTicket.status === 'resolved'
  const canEdit = !isClosed && !editing
  const normalizedStatus = localTicket.status === 'closed' ? 'resolved' : localTicket.status
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === normalizedStatus)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v) }}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetDescription className="sr-only">Ticket details and conversation</SheetDescription>

        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            {editing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-base font-semibold h-auto py-1"
                autoFocus
              />
            ) : (
              <SheetTitle className="text-base leading-snug pr-2">{localTicket.title}</SheetTitle>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={startEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge className={statusColor(localTicket.status)}>{statusLabel(localTicket.status)}</Badge>
            <Badge variant="outline" className={priorityColor(localTicket.priority)}>{localTicket.priority}</Badge>
            <Badge variant="secondary">{categoryLabel(localTicket.category)}</Badge>
            <span className="text-xs text-muted-foreground">{timeAgo(localTicket.created_at)}</span>
          </div>
        </SheetHeader>

        {/* Status stepper */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIdx
              const isActive = idx === currentStepIdx
              const isUpcoming = idx > currentStepIdx
              return (
                <div key={step.key} className="flex items-start flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={[
                        'h-6 w-6 rounded-full flex items-center justify-center transition-all shrink-0',
                        isCompleted ? 'bg-emerald-500 text-white' : '',
                        isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary/20' : '',
                        isUpcoming ? 'bg-muted border border-border text-muted-foreground/40' : '',
                      ].join(' ')}
                    >
                      {isCompleted
                        ? <Check className="h-3 w-3" />
                        : <span className="text-[10px] font-medium">{idx + 1}</span>
                      }
                    </div>
                    <span
                      className={[
                        'text-[10px] whitespace-nowrap leading-none',
                        isCompleted ? 'text-emerald-400' : '',
                        isActive ? 'text-foreground font-medium' : '',
                        isUpcoming ? 'text-muted-foreground/40' : '',
                      ].join(' ')}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={[
                        'flex-1 h-px mt-3 mx-1.5',
                        idx < currentStepIdx ? 'bg-emerald-500/50' : 'bg-border',
                      ].join(' ')}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Resolved banner */}
        {isClosed && (
          <div className="mx-6 mt-4 mb-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-3 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                {localTicket.status === 'closed' ? 'Ticket closed' : 'Ticket resolved'}
              </p>
              {localTicket.resolved_at && (
                <p className="text-xs text-emerald-400/60 mt-0.5">
                  {new Date(localTicket.resolved_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Description / edit form */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={editCategory} onValueChange={(v) => setEditCategory(v as SupportTicketCategory)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as SupportTicketPriority)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={updateTicket.isPending}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateTicket.isPending}>
                  <Check className="h-3.5 w-3.5" />
                  {updateTicket.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">{localTicket.description}</p>
              {localTicket.attachment_url && (
                <a
                  href={localTicket.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={localTicket.attachment_url}
                    alt="Attachment"
                    className="w-full max-h-48 object-contain bg-secondary/30"
                  />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
          {messagesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : !messages?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_id === user?.id} />
            ))
          )}
        </div>

        {/* Reply area */}
        {!isClosed ? (
          <div className="px-6 py-4 border-t border-border space-y-3 shrink-0">
            <Textarea
              placeholder="Type your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
              }}
            />
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={updateTicket.isPending}>
                Close Ticket
              </Button>
              <Button size="sm" onClick={handleSend} disabled={!reply.trim() || addMessage.isPending}>
                <Send className="h-3.5 w-3.5" />
                {addMessage.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function MessageBubble({ message, isOwn }: { message: EnrichedMessage; isOwn: boolean }) {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
          isOwn
            ? 'bg-primary/10 border border-primary/20'
            : 'bg-secondary/80 border border-border'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
      </div>
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <span className="text-[11px] text-muted-foreground">
          {isOwn ? 'You' : message.sender_email}
        </span>
        <span className="text-[11px] text-muted-foreground/60">
          {timeAgo(message.created_at)}
        </span>
      </div>
    </div>
  )
}

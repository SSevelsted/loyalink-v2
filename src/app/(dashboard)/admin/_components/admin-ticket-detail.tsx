'use client'

import { useState } from 'react'
import { useTicketMessages, useAddMessage, useUpdateTicket, type EnrichedMessage } from '@/hooks/use-support'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { SupportTicket, SupportTicketStatus, SupportTicketPriority } from '@/types/database'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, CheckCircle2, UserCheck } from 'lucide-react'
import {
  timeAgo,
  adminStatusLabel,
  categoryLabel,
} from '../../support/_components/shared'

type AdminTicketWithStudio = SupportTicket & { studios: { name: string } | null }

type Props = {
  ticket: AdminTicketWithStudio | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_customer', label: 'Waiting on Customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS: { value: SupportTicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function AdminTicketDetail({ ticket, open, onOpenChange }: Props) {
  const { user } = useAuth()
  const { data: messages, isLoading: messagesLoading } = useTicketMessages(ticket?.id ?? null)
  const addMessage = useAddMessage()
  const updateTicket = useUpdateTicket()
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  const handleSend = async () => {
    if (!reply.trim() || !ticket) return
    try {
      await addMessage.mutateAsync({ ticketId: ticket.id, message: reply.trim(), isInternal })
      setReply('')
      setIsInternal(false)
    } catch {
      toast.error('Failed to send message')
    }
  }

  const handleStatusChange = async (status: SupportTicketStatus) => {
    if (!ticket) return
    try {
      await updateTicket.mutateAsync({ id: ticket.id, status })
      toast.success(`Status updated to ${adminStatusLabel(status)}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handlePriorityChange = async (priority: SupportTicketPriority) => {
    if (!ticket) return
    try {
      await updateTicket.mutateAsync({ id: ticket.id, priority })
      toast.success(`Priority updated to ${priority}`)
    } catch {
      toast.error('Failed to update priority')
    }
  }

  const handleAssignToMe = async () => {
    if (!ticket || !user) return
    try {
      await updateTicket.mutateAsync({ id: ticket.id, assigned_to: user.id })
      toast.success('Ticket assigned to you')
    } catch {
      toast.error('Failed to assign ticket')
    }
  }

  const handleResolve = async () => {
    if (!ticket) return
    try {
      await updateTicket.mutateAsync({ id: ticket.id, status: 'resolved' })
      toast.success('Ticket marked as resolved')
    } catch {
      toast.error('Failed to resolve ticket')
    }
  }

  if (!ticket) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="pr-8">{ticket.title}</SheetTitle>
          <SheetDescription className="text-xs font-mono text-muted-foreground/60">
            {ticket.id.slice(0, 8)}
          </SheetDescription>
        </SheetHeader>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-2 px-4">
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Studio</p>
            <p className="text-sm font-medium">{ticket.studios?.name ?? 'Unknown'}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Status</p>
            <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as SupportTicketStatus)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Priority</p>
            <Select value={ticket.priority} onValueChange={(v) => handlePriorityChange(v as SupportTicketPriority)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Assigned</p>
            {ticket.assigned_to ? (
              <p className="text-sm font-medium text-emerald-400">Assigned</p>
            ) : (
              <Button variant="outline" size="xs" onClick={handleAssignToMe} disabled={updateTicket.isPending}>
                <UserCheck className="h-3 w-3" />
                Assign to me
              </Button>
            )}
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Category</p>
            <p className="text-sm">{categoryLabel(ticket.category)}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Created</p>
            <p className="text-sm">{timeAgo(ticket.created_at)}</p>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-3 bg-secondary/50 rounded-lg mx-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-0">
          {messagesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : !messages?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <AdminMessageBubble key={msg.id} message={msg} currentUserId={user?.id} />
            ))
          )}
        </div>

        {/* Reply + actions */}
        <div className="p-4 border-t space-y-3">
          <Textarea
            placeholder={isInternal ? 'Write an internal note...' : 'Type your reply...'}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            className={isInternal ? 'border-amber-500/30' : ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isInternal}
                  onCheckedChange={setIsInternal}
                  size="sm"
                />
                <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => setIsInternal(!isInternal)}>
                  Internal note
                </Label>
              </div>
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <Button variant="outline" size="sm" onClick={handleResolve} disabled={updateTicket.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Resolved
                </Button>
              )}
            </div>
            <Button size="sm" onClick={handleSend} disabled={!reply.trim() || addMessage.isPending}>
              <Send className="h-3.5 w-3.5" />
              {addMessage.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AdminMessageBubble({ message, currentUserId }: { message: EnrichedMessage; currentUserId?: string }) {
  const isOwn = message.sender_id === currentUserId

  if (message.is_internal) {
    return (
      <div className="border border-dashed border-amber-500/30 bg-amber-500/5 rounded-xl px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">Internal note</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[11px] text-muted-foreground">{message.sender_email}</span>
          <span className="text-[11px] text-muted-foreground/60">{timeAgo(message.created_at)}</span>
        </div>
      </div>
    )
  }

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

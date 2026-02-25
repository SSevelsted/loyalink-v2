'use client'

import { useState } from 'react'
import { useTickets } from '@/hooks/use-support'
import type { SupportTicket } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  LifeBuoy,
  Bug,
  CreditCard,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  CheckCircle2,
} from 'lucide-react'
import { TicketBuilder } from './_components/ticket-builder'
import { TicketDetail } from './_components/ticket-detail'
import {
  timeAgo,
  statusLabel,
  statusColor,
  priorityColor,
  categoryLabel,
  categoryIcon,
} from './_components/shared'
import type { SupportTicketCategory } from '@/types/database'

const CATEGORY_ICONS: Record<SupportTicketCategory, React.ElementType> = {
  bug: Bug,
  billing: CreditCard,
  feature_request: Lightbulb,
  question: HelpCircle,
  other: MoreHorizontal,
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_customer', label: 'Waiting on You' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export default function SupportPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: tickets, isLoading } = useTickets(
    statusFilter === 'all' ? undefined : statusFilter
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Support
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Report issues and track your requests
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="glow" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : !tickets?.length ? (
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No tickets found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create a ticket to get help from our team</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const Icon = CATEGORY_ICONS[ticket.category]
            const isDone = ticket.status === 'resolved' || ticket.status === 'closed'
            return (
              <Card
                key={ticket.id}
                variant="glass-hover"
                className={`rounded-2xl cursor-pointer transition-all hover:shadow-md ${isDone ? 'border-emerald-500/20' : ''}`}
                onClick={() => {
                  setSelectedTicket(ticket)
                  setDetailOpen(true)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 relative ${isDone ? 'bg-emerald-500/10' : categoryIcon(ticket.category)}`}>
                        {isDone
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          : <Icon className="h-4 w-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isDone ? 'text-muted-foreground' : 'text-foreground'}`}>{ticket.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{categoryLabel(ticket.category)}</span>
                          <span className="text-xs text-muted-foreground/50">·</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(ticket.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isDone && <Badge variant="outline" className={priorityColor(ticket.priority)}>{ticket.priority}</Badge>}
                      <Badge className={statusColor(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <TicketBuilder open={createOpen} onOpenChange={setCreateOpen} />
      <TicketDetail
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={(updated) => setSelectedTicket(updated)}
      />
    </div>
  )
}

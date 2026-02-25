'use client'

import { useState } from 'react'
import { useAdminTickets, type AdminTicket } from '@/hooks/use-support'
import { useAdminTicketStats } from '@/hooks/use-admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Inbox, Clock, AlertTriangle, MessageSquare, LifeBuoy } from 'lucide-react'
import { AdminTicketDetail } from './admin-ticket-detail'
import {
  timeAgo,
  adminStatusLabel,
  statusColor,
  priorityColor,
} from '../../support/_components/shared'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_customer', label: 'Waiting on Customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function SupportSection() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: stats, isLoading: statsLoading } = useAdminTicketStats()
  const { data: tickets, isLoading: ticketsLoading } = useAdminTickets({
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
  })

  const kpis = [
    { title: 'Open', value: stats?.open ?? 0, icon: Inbox, color: 'text-blue-400' },
    { title: 'In Progress', value: stats?.in_progress ?? 0, icon: Clock, color: 'text-amber-400' },
    { title: 'Urgent / High', value: stats?.urgent_high ?? 0, icon: AlertTriangle, color: 'text-red-400' },
    { title: 'Waiting on Customer', value: stats?.waiting_on_customer ?? 0, icon: MessageSquare, color: 'text-violet-400' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} variant="glass-hover" className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 animate-shimmer rounded" />
              ) : (
                <p className="text-display-lg text-foreground">{kpi.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-3">
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
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ticket list */}
      {ticketsLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : !tickets?.length ? (
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No tickets found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              variant="glass-hover"
              className="rounded-2xl cursor-pointer transition-all hover:shadow-md"
              onClick={() => {
                setSelectedTicket(ticket)
                setDetailOpen(true)
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {ticket.studios?.name ?? 'Unknown'}
                      </Badge>
                      <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(ticket.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={priorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    <Badge className={statusColor(ticket.status)}>{adminStatusLabel(ticket.status)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AdminTicketDetail ticket={selectedTicket} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}

import type { SupportTicketStatus, SupportTicketPriority, SupportTicketCategory } from '@/types/database'

export function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function statusLabel(status: SupportTicketStatus): string {
  const labels: Record<SupportTicketStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_on_customer: 'Waiting on You',
    resolved: 'Resolved',
    closed: 'Closed',
  }
  return labels[status]
}

export function adminStatusLabel(status: SupportTicketStatus): string {
  const labels: Record<SupportTicketStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_on_customer: 'Waiting on Customer',
    resolved: 'Resolved',
    closed: 'Closed',
  }
  return labels[status]
}

export function statusColor(status: SupportTicketStatus): string {
  const colors: Record<SupportTicketStatus, string> = {
    open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    waiting_on_customer: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-muted text-muted-foreground border-border',
  }
  return colors[status]
}

export function priorityColor(priority: SupportTicketPriority): string {
  const colors: Record<SupportTicketPriority, string> = {
    low: 'text-muted-foreground border-border',
    medium: 'text-blue-400 border-blue-500/20',
    high: 'text-amber-400 border-amber-500/20',
    urgent: 'text-red-400 border-red-500/20',
  }
  return colors[priority]
}

export function categoryLabel(category: SupportTicketCategory): string {
  const labels: Record<SupportTicketCategory, string> = {
    bug: 'Bug',
    billing: 'Billing',
    feature_request: 'Feature Request',
    question: 'Question',
    other: 'Other',
  }
  return labels[category]
}

export function categoryIcon(category: SupportTicketCategory): string {
  const icons: Record<SupportTicketCategory, string> = {
    bug: 'bg-red-500/10 text-red-400',
    billing: 'bg-emerald-500/10 text-emerald-400',
    feature_request: 'bg-violet-500/10 text-violet-400',
    question: 'bg-blue-500/10 text-blue-400',
    other: 'bg-muted text-muted-foreground',
  }
  return icons[category]
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useStudio } from '@/hooks/use-studio'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ROLES } from '@/lib/constants'
import type { StudioMember, Invitation } from '@/types/database'
import { Crown, Shield, Users, Trash2 } from 'lucide-react'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  member: 'bg-secondary text-muted-foreground',
}

export function TeamSection() {
  const { currentStudio, membership } = useStudio()
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'

  // Team members
  const { data: members } = useQuery({
    queryKey: ['studio_members', currentStudio?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('studio_members')
        .select('*, auth_user:user_id(email)')
        .eq('studio_id', currentStudio!.id)
      return data as (StudioMember & { auth_user: { email: string } })[]
    },
    enabled: !!currentStudio,
  })

  // Invitations
  const { data: invitations } = useQuery({
    queryKey: ['invitations', currentStudio?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('studio_id', currentStudio!.id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      return data as Invitation[]
    },
    enabled: !!currentStudio,
  })

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })

  const sendInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          studio_id: currentStudio!.id,
          email: inviteForm.email,
          role: inviteForm.role,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setInviteOpen(false)
      setInviteForm({ email: '', role: 'member' })
      toast.success(`Invitation created. Share this link: ${window.location.origin}/invite/${data.token}`)
    },
    onError: () => toast.error('Failed to send invitation'),
  })

  // Remove member — confirmation dialog
  const [removeTarget, setRemoveTarget] = useState<{ id: string; email: string } | null>(null)
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('studio_members')
        .delete()
        .eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_members'] })
      setRemoveTarget(null)
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  // Change role
  const changeRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from('studio_members')
        .update({ role })
        .eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio_members'] })
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })

  // Cancel invitation — confirmation dialog
  const [cancelTarget, setCancelTarget] = useState<{ id: string; email: string } | null>(null)
  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setCancelTarget(null)
      toast.success('Invitation cancelled')
    },
    onError: () => toast.error('Failed to cancel invitation'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Team</h2>
        <p className="text-sm text-muted-foreground">Manage your team members and invitations.</p>
      </div>

      {/* Role permissions */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-secondary/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold">Owner</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Full access. Manage team, billing, and all settings.</p>
            </div>
            <div className="rounded-xl bg-secondary/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold">Admin</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Manage team, customers, and settings. Cannot delete studio or transfer ownership.</p>
            </div>
            <div className="rounded-xl bg-secondary/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold">Member</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">View customers, process transactions. Cannot change settings.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team members */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Team Members</CardTitle>
          {isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Invite</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{capitalize(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => sendInvite.mutate()} disabled={!inviteForm.email || sendInvite.isPending}>
                    {sendInvite.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((m) => {
                const isOwner = m.role === 'owner'
                const isSelf = m.user_id === user?.id
                const canChangeRole = isAdmin && !isOwner && !isSelf
                const canRemove = isAdmin && !isOwner && !isSelf
                const email = m.auth_user?.email ?? m.user_id

                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{email}</span>
                        {isSelf && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canChangeRole ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) => changeRole.mutate({ memberId: m.id, role: v })}
                        >
                          <SelectTrigger className="w-[110px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.filter((r) => r !== 'owner').map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">{capitalize(r)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className={ROLE_STYLES[m.role] ?? ''}>
                          {capitalize(m.role)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveTarget({ id: m.id, email })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {!members?.length && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations?.length ? (
        <Card variant="glass" className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  {isAdmin && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell><Badge variant="secondary" className={ROLE_STYLES[inv.role] ?? ''}>{capitalize(inv.role)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => setCancelTarget({ id: inv.id, email: inv.email })}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {/* Remove member confirmation dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <span className="font-medium text-foreground">{removeTarget?.email}</span> from this studio? They will lose access immediately.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeTarget && removeMember.mutate(removeTarget.id)}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel invitation confirmation dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel invitation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cancel the pending invitation for <span className="font-medium text-foreground">{cancelTarget?.email}</span>? The invite link will stop working.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
                Keep
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cancelTarget && cancelInvitation.mutate(cancelTarget.id)}
                disabled={cancelInvitation.isPending}
              >
                {cancelInvitation.isPending ? 'Cancelling...' : 'Cancel Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

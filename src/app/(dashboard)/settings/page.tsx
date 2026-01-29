'use client'

import { useState } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { StudioMember, Invitation, CashbackTier } from '@/types/database'
import { ROLES } from '@/lib/constants'

export default function SettingsPage() {
  const { currentStudio, membership } = useStudio()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'

  // Studio info
  const [studioName, setStudioName] = useState(currentStudio?.name ?? '')

  const updateStudio = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('studios')
        .update({ name: studioName })
        .eq('id', currentStudio!.id)
      if (error) throw error
    },
    onSuccess: () => toast.success('Studio updated'),
  })

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
  })

  // Cashback tiers
  const { data: tiers } = useQuery({
    queryKey: ['cashback_tiers', currentStudio?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('cashback_tiers')
        .select('*')
        .eq('studio_id', currentStudio!.id)
        .order('sort_order')
      return data as CashbackTier[]
    },
    enabled: !!currentStudio,
  })

  const [tierForm, setTierForm] = useState({ name: '', min_spend: '', cashback_rate: '' })

  const addTier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('cashback_tiers').insert({
        studio_id: currentStudio!.id,
        name: tierForm.name,
        min_spend: parseFloat(tierForm.min_spend),
        cashback_rate: parseFloat(tierForm.cashback_rate),
        sort_order: (tiers?.length ?? 0) + 1,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashback_tiers'] })
      setTierForm({ name: '', min_spend: '', cashback_rate: '' })
      toast.success('Tier added')
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="cashback">Cashback Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle>Studio Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Studio Name</Label>
                <Input
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={currentStudio?.slug ?? ''} disabled />
              </div>
              {isAdmin && (
                <Button onClick={() => updateStudio.mutate()} disabled={updateStudio.isPending}>
                  Save
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card variant="glass" className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
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
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
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
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={() => sendInvite.mutate()} disabled={!inviteForm.email || sendInvite.isPending}>
                        Send Invitation
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.auth_user?.email ?? m.user_id}</TableCell>
                      <TableCell><Badge variant="secondary">{m.role}</Badge></TableCell>
                      <TableCell>{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {invitations?.length ? (
            <Card variant="glass" className="rounded-2xl">
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell><Badge variant="secondary">{inv.role}</Badge></TableCell>
                        <TableCell>{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="cashback" className="space-y-4">
          <Card variant="glass" className="rounded-2xl">
            <CardHeader>
              <CardTitle>Cashback Tiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Min Spend</TableHead>
                    <TableHead>Cashback Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers?.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell>{tier.name}</TableCell>
                      <TableCell>{Number(tier.min_spend).toFixed(2)} kr</TableCell>
                      <TableCell>{tier.cashback_rate}%</TableCell>
                    </TableRow>
                  ))}
                  {!tiers?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No tiers configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {isAdmin && (
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={tierForm.name}
                      onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                      placeholder="Gold"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min Spend</Label>
                    <Input
                      type="number"
                      value={tierForm.min_spend}
                      onChange={(e) => setTierForm({ ...tierForm, min_spend: e.target.value })}
                      placeholder="1000"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rate %</Label>
                    <Input
                      type="number"
                      value={tierForm.cashback_rate}
                      onChange={(e) => setTierForm({ ...tierForm, cashback_rate: e.target.value })}
                      placeholder="5"
                      className="h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addTier.mutate()}
                    disabled={!tierForm.name || addTier.isPending}
                  >
                    Add
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

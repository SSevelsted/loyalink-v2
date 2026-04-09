'use client'

import { useState } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { useRewardsConfig } from '@/hooks/use-rewards'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Gift, Plus, Trash2, Zap, Crown, Clock, Hash, Infinity } from 'lucide-react'
import type { Promotion, MemberPromotion } from '@/types/database'

export default function PromotionsPage() {
  const { currentStudio, membership } = useStudio()
  const { data: rewardsConfig } = useRewardsConfig()
  const queryClient = useQueryClient()
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const studioId = currentStudio?.id

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'cashback_boost' | 'tier_override'>('cashback_boost')
  const [cashbackRate, setCashbackRate] = useState('')
  const [tierSlug, setTierSlug] = useState('')
  const [durationType, setDurationType] = useState<'transactions' | 'days' | 'unlimited'>('transactions')
  const [durationValue, setDurationValue] = useState('1')

  // Fetch promotion templates
  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ['promotions', studioId],
    queryFn: async () => {
      const res = await fetch(`/api/promotions?studioId=${studioId}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!studioId,
  })

  // Fetch all active member promotions
  const { data: activePromotions = [] } = useQuery<(MemberPromotion & { customers?: { name: string } })[]>({
    queryKey: ['active-member-promotions', studioId],
    queryFn: async () => {
      const res = await fetch(`/api/promotions/active?studioId=${studioId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!studioId,
  })

  const createPromotion = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId,
          name,
          type,
          cashback_rate: type === 'cashback_boost' ? Number(cashbackRate) : null,
          tier_slug: type === 'tier_override' ? tierSlug : null,
          duration_type: durationType,
          duration_value: Number(durationValue) || 1,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Promotion created')
      setCreateOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/promotions/${id}?studioId=${studioId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      toast.success('Promotion deleted')
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`/api/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId, is_active }),
      })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })

  const resetForm = () => {
    setName('')
    setType('cashback_boost')
    setCashbackRate('')
    setTierSlug('')
    setDurationType('transactions')
    setDurationValue('1')
  }

  const getDurationLabel = (p: Promotion) => {
    if (p.duration_type === 'unlimited') return 'Unlimited'
    if (p.duration_type === 'transactions') return `${p.duration_value} transaction${p.duration_value !== 1 ? 's' : ''}`
    return `${p.duration_value} day${p.duration_value !== 1 ? 's' : ''}`
  }

  const getDurationIcon = (dt: string) => {
    if (dt === 'transactions') return Hash
    if (dt === 'days') return Clock
    return Infinity
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Promotions</h1>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Promotion
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Create promotion templates to apply temporary cashback boosts or tier overrides to specific customers.
      </p>

      {/* Promotion templates */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Templates</h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No promotions yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo) => {
              const DurIcon = getDurationIcon(promo.duration_type)
              return (
                <Card key={promo.id} className={`glass-card transition-opacity ${!promo.is_active ? 'opacity-50' : ''}`}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {promo.type === 'cashback_boost' ? (
                        <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : (
                        <Crown className="h-4 w-4 text-violet-400 shrink-0" />
                      )}
                      <CardTitle className="text-sm truncate">{promo.name}</CardTitle>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleActive.mutate({ id: promo.id, is_active: !promo.is_active })}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            promo.is_active
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              : 'border-border text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          {promo.is_active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => deletePromotion.mutate(promo.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      {promo.type === 'cashback_boost' ? (
                        <Badge variant="secondary" className="text-xs">{promo.cashback_rate}% cashback</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Tier: {promo.tier_slug}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DurIcon className="h-3 w-3" />
                      {getDurationLabel(promo)}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Promotion</DialogTitle>
            <DialogDescription>
              Define a reusable promotion template that can be applied to individual customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="promo-name">Name</Label>
              <Input
                id="promo-name"
                placeholder="e.g. Consultation Bonus"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashback_boost">Cashback Boost</SelectItem>
                  <SelectItem value="tier_override">Tier Override</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'cashback_boost' && (
              <div>
                <Label htmlFor="promo-rate">Cashback Rate (%)</Label>
                <Input
                  id="promo-rate"
                  type="number"
                  placeholder="20"
                  value={cashbackRate}
                  onChange={(e) => setCashbackRate(e.target.value)}
                />
              </div>
            )}

            {type === 'tier_override' && (
              <div>
                <Label>Tier</Label>
                <Select value={tierSlug} onValueChange={setTierSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {(rewardsConfig?.tiers ?? []).map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name} ({t.cashback_rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Duration</Label>
              <Select value={durationType} onValueChange={(v) => setDurationType(v as typeof durationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactions">Number of transactions</SelectItem>
                  <SelectItem value="days">Number of days</SelectItem>
                  <SelectItem value="unlimited">Unlimited (manual revoke)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {durationType !== 'unlimited' && (
              <div>
                <Label htmlFor="promo-duration">
                  {durationType === 'transactions' ? 'Transactions' : 'Days'}
                </Label>
                <Input
                  id="promo-duration"
                  type="number"
                  min="1"
                  placeholder={durationType === 'transactions' ? '1' : '365'}
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={() => createPromotion.mutate()}
              disabled={!name.trim() || createPromotion.isPending || (type === 'cashback_boost' && !cashbackRate) || (type === 'tier_override' && !tierSlug)}
              className="w-full"
            >
              {createPromotion.isPending ? 'Creating...' : 'Create Promotion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

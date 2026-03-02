'use client'

import { useParams } from 'next/navigation'
import { useCustomer, useCustomerEvents, useUpdateCustomer } from '@/hooks/use-customers'
import { useCustomerPasses, useGeneratePass, usePassDeviceRegistrations } from '@/hooks/use-wallet'
import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useMemo, useState } from 'react'
import type { Transaction } from '@/types/database'
import { TIER_COLOR_PALETTE } from '@/types/database'
import { useCustomerReferrals, useRewardsConfig } from '@/hooks/use-rewards'
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Pencil,
  Percent,
  Plus,
  Share2,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { getTierDisplayName, getTierIndex, TRANSACTION_LABELS } from '@/lib/format'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { QRCodeSVG } from 'qrcode.react'

type DatePreset = '7d' | '30d' | '90d' | 'all'

function getDateCutoff(preset: DatePreset): Date | null {
  if (preset === 'all') return null
  const d = new Date()
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  d.setDate(d.getDate() - days)
  return d
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: customer, isLoading } = useCustomer(params.id)
  const { data: passes } = useCustomerPasses(params.id)
  const { currentStudio, membership } = useStudio()
  const updateCustomer = useUpdateCustomer()
  const generatePass = useGeneratePass()
  const { data: referrals } = useCustomerReferrals(params.id)
  const { data: rewardsConfig } = useRewardsConfig()
  const { data: customerEvents } = useCustomerEvents(params.id)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const serialNumbers = useMemo(() => passes?.map((p) => p.serial_number) ?? [], [passes])
  const { data: deviceRegs } = usePassDeviceRegistrations(serialNumbers)

  const currencyConfig = getCurrencyConfig(
    (currentStudio?.settings?.currency as string) ?? 'kr'
  )

  const { data: transactions } = useQuery({
    queryKey: ['transactions', params.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false })
      return data as Transaction[]
    },
    enabled: !!params.id,
  })

  const [txDatePreset, setTxDatePreset] = useState<DatePreset>('all')

  // Admin overrides
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin' || membership?.role === 'super_admin'
  const [editTierOpen, setEditTierOpen] = useState(false)
  const [editBalanceOpen, setEditBalanceOpen] = useState(false)
  const [editBalanceValue, setEditBalanceValue] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Derived stats
  const stats = useMemo(() => {
    if (!transactions) return { purchaseCount: 0, avgSpend: 0 }
    const purchases = transactions.filter((tx) => tx.type === 'credit')
    const purchaseCount = purchases.length
    const purchaseTotal = purchases.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)
    const avgSpend = purchaseCount > 0 ? purchaseTotal / purchaseCount : 0
    return { purchaseCount, avgSpend }
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    const cutoff = getDateCutoff(txDatePreset)
    if (!cutoff) return transactions
    return transactions.filter((tx) => new Date(tx.created_at) >= cutoff)
  }, [transactions, txDatePreset])

  const referralStats = useMemo(() => {
    if (!referrals) return { sent: 0, activated: 0, pending: 0, totalEarned: 0 }
    return {
      sent: referrals.length,
      activated: referrals.filter((r) => r.status === 'activated').length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      totalEarned: referrals.reduce((sum, r) => sum + r.total_commission_earned, 0),
    }
  }, [referrals])

  const passTimeline = useMemo(() => {
    const events: Array<{ date: string; label: string; icon: 'created' | 'installed' | 'uninstalled' | 'updated' }> = []
    if (passes?.length) {
      const pass = passes[0]
      events.push({ date: pass.created_at, label: `${pass.platform === 'apple' ? 'Apple' : 'Google'} Wallet pass generated`, icon: 'created' })
      if (pass.updated_at !== pass.created_at) {
        events.push({ date: pass.updated_at, label: 'Pass last updated', icon: 'updated' })
      }
    }
    if (deviceRegs?.length) {
      for (const reg of deviceRegs) {
        events.push({
          date: reg.created_at,
          label: reg.is_active ? 'Added to device' : 'Removed from device',
          icon: reg.is_active ? 'installed' : 'uninstalled',
        })
      }
    }
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return events
  }, [passes, deviceRegs])

  const tierHistory = useMemo(() => {
    if (!customerEvents) return []
    return customerEvents
      .filter((e) => e.event_type === 'tier_change')
      .map((e) => ({
        date: e.created_at,
        from: (e.metadata.from_tier_name as string) ?? (e.metadata.from_tier as string) ?? '?',
        to: (e.metadata.to_tier_name as string) ?? (e.metadata.to_tier as string) ?? '?',
        cashbackRate: e.metadata.cashback_rate as number | undefined,
      }))
  }, [customerEvents])

  if (isLoading || !customer) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-4 w-32 animate-shimmer rounded" />
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const handleChangeTier = async (tierSlug: string) => {
    const tier = rewardsConfig?.tiers.find((t) => t.slug === tierSlug)
    if (!tier) return
    await updateCustomer.mutateAsync({
      id: customer.id,
      loyalty_stage: tier.slug,
      cashback_rate: tier.cashback_rate,
    })
    toast.success(`Tier changed to ${tier.name}`)
    setEditTierOpen(false)
  }

  const handleSetBalance = async () => {
    const value = parseFloat(editBalanceValue)
    if (isNaN(value)) return
    await updateCustomer.mutateAsync({ id: customer.id, balance: value })
    toast.success('Balance updated')
    setEditBalanceOpen(false)
    setEditBalanceValue('')
  }

  const handleGeneratePass = async () => {
    if (!currentStudio) return
    await generatePass.mutateAsync({
      customerId: customer.id,
      studioId: currentStudio.id,
      templateId: '',
    })
  }

  const tierIdx = getTierIndex(customer.loyalty_stage, rewardsConfig)
  const tierPalette = TIER_COLOR_PALETTE[tierIdx % TIER_COLOR_PALETTE.length]
  const memberSince = new Date(customer.created_at)
  const daysSinceJoin = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-6 stagger-children">
      {/* Back + Header */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Customers
        </Link>
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xl font-semibold text-foreground shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-display-lg text-foreground truncate" style={{ fontFamily: 'var(--font-display)' }}>{customer.name}</h1>
            <p className="text-sm text-muted-foreground">{customer.email ?? customer.phone ?? 'No contact'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs uppercase tracking-wider ${tierPalette.bg} ${tierPalette.text} ${tierPalette.border}`}
            >
              {getTierDisplayName(customer.loyalty_stage, rewardsConfig)}
            </Badge>
            {isAdmin && (
              <Dialog open={editTierOpen} onOpenChange={setEditTierOpen}>
                <DialogTrigger asChild>
                  <button className="h-7 w-7 rounded-lg bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Tier</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Override this customer&apos;s tier. This will also update their cashback rate.
                    </p>
                    {(rewardsConfig?.tiers ?? []).map((tier) => {
                      const idx = getTierIndex(tier.slug, rewardsConfig)
                      const p = TIER_COLOR_PALETTE[idx % TIER_COLOR_PALETTE.length]
                      const isCurrent = customer.loyalty_stage === tier.slug
                      return (
                        <button
                          key={tier.slug}
                          onClick={() => handleChangeTier(tier.slug)}
                          disabled={isCurrent || updateCustomer.isPending}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            isCurrent
                              ? `${p.border} ${p.bg} opacity-60 cursor-default`
                              : `border-border/50 hover:${p.bg} hover:${p.border}`
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm font-medium ${isCurrent ? p.text : 'text-foreground'}`}>
                                {tier.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{tier.cashback_rate}% cashback</p>
                            </div>
                            {isCurrent && (
                              <Badge variant="outline" className="text-[10px]">Current</Badge>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button size="sm" asChild>
              <Link href={`/customers/${customer.id}/transaction`}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Record Transaction
              </Link>
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance</span>
              </div>
              {isAdmin && (
                <Dialog open={editBalanceOpen} onOpenChange={(open) => {
                  setEditBalanceOpen(open)
                  if (open) setEditBalanceValue(Number(customer.balance).toFixed(2))
                }}>
                  <DialogTrigger asChild>
                    <button className="h-6 w-6 rounded-md bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
                      <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Balance</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">
                        Override this customer&apos;s balance directly. For regular transactions, use &quot;Record Transaction&quot; instead.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">New Balance</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editBalanceValue}
                          onChange={(e) => setEditBalanceValue(e.target.value)}
                          className="bg-secondary/50"
                          autoFocus
                        />
                      </div>
                      <Button onClick={handleSetBalance} className="w-full" disabled={!editBalanceValue || updateCustomer.isPending}>
                        {updateCustomer.isPending ? 'Updating...' : 'Set Balance'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{formatAmount(Number(customer.balance), currencyConfig)}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Lifetime Spend</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatAmount(Number(customer.total_real_spend ?? 0), currencyConfig)}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Purchases</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.purchaseCount}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg. Spend</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.purchaseCount > 0 ? formatAmount(stats.avgSpend, currencyConfig) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Cashback</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{customer.cashback_rate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Member Since</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {memberSince.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-muted-foreground">{daysSinceJoin} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals + Wallet Pass + Tier History */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Referrals */}
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-400" />
                Referrals
              </CardTitle>
              {customer.referral_code && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(customer.referral_code!)
                    toast.success('Referral code copied')
                  }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Copy className="h-3 w-3" />
                  {customer.referral_code}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl bg-secondary/30 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{referralStats.sent}</p>
                <p className="text-[11px] text-muted-foreground">Sent</p>
              </div>
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-2.5 text-center">
                <p className="text-lg font-bold text-emerald-400">{referralStats.activated}</p>
                <p className="text-[11px] text-muted-foreground">Activated</p>
              </div>
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-2.5 text-center">
                <p className="text-lg font-bold text-amber-400">{referralStats.pending}</p>
                <p className="text-[11px] text-muted-foreground">Pending</p>
              </div>
            </div>

            {referralStats.totalEarned > 0 && (
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 px-3 py-2 mb-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Commission earned</span>
                <span className="text-sm font-semibold text-blue-400">{formatAmount(referralStats.totalEarned, currencyConfig)}</span>
              </div>
            )}

            {referrals && referrals.length > 0 ? (
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {referrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-foreground">
                        {ref.referred_customer?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm text-foreground">{ref.referred_customer?.name ?? 'Unknown'}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        ref.status === 'activated'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : ref.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {ref.status === 'activated' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {ref.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {ref.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No referrals yet</p>
            )}
          </CardContent>
        </Card>

        {/* Wallet Pass */}
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-400" />
              Wallet Pass
            </CardTitle>
          </CardHeader>
          <CardContent>
            {passes?.length ? (() => {
              const passUrl = `/pass/${passes[0].serial_number}`
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {passes[0].platform === 'apple' ? 'Apple' : 'Google'} Wallet &middot; {passes[0].status}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Dialog open={shareOpen} onOpenChange={(open) => {
                        setShareOpen(open)
                        if (!open) setLinkCopied(false)
                      }}>
                        <DialogTrigger asChild>
                          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                            <Share2 className="h-3.5 w-3.5" />
                            Share
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Share Wallet Pass</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-5 pt-2">
                            <p className="text-sm text-muted-foreground">
                              Share this link with the customer. It works for both Apple Wallet (iPhone) and Google Wallet (Android).
                            </p>
                            <div className="flex justify-center">
                              <div className="rounded-2xl bg-white p-4">
                                <QRCodeSVG value={passUrl} size={180} level="M" />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                readOnly
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}${passUrl}`}
                                className="bg-secondary/50 text-xs font-mono"
                                onFocus={(e) => e.target.select()}
                              />
                              <Button
                                size="sm"
                                variant={linkCopied ? 'default' : 'outline'}
                                className="shrink-0 gap-1.5"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}${passUrl}`)
                                  setLinkCopied(true)
                                  toast.success('Link copied to clipboard')
                                  setTimeout(() => setLinkCopied(false), 2000)
                                }}
                              >
                                {linkCopied ? (
                                  <><CheckCircle2 className="h-3.5 w-3.5" />Copied</>
                                ) : (
                                  <><Copy className="h-3.5 w-3.5" />Copy</>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              iPhone opens Apple Wallet · Android opens Google Wallet · Desktop shows QR codes
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <a
                        href={passUrl}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  </div>

                  {passTimeline.length > 0 && (
                    <div className="space-y-0">
                      {passTimeline.map((event, i) => (
                        <div key={i} className="flex items-start gap-3 relative">
                          {i < passTimeline.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/50" />
                          )}
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            event.icon === 'installed' ? 'bg-emerald-500/10' :
                            event.icon === 'uninstalled' ? 'bg-red-500/10' :
                            'bg-secondary'
                          }`}>
                            {event.icon === 'installed' ? (
                              <Smartphone className="h-3 w-3 text-emerald-400" />
                            ) : event.icon === 'uninstalled' ? (
                              <Smartphone className="h-3 w-3 text-red-400" />
                            ) : (
                              <Wallet className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm text-foreground">{event.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })() : (
              <div className="text-center py-6">
                <Wallet className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No wallet pass generated yet</p>
                <Button size="sm" variant="outline" onClick={handleGeneratePass} disabled={generatePass.isPending}>
                  {generatePass.isPending ? 'Generating...' : 'Generate Pass'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier History */}
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-amber-400" />
              Tier History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-xl border ${tierPalette.border} ${tierPalette.bg} px-3 py-2.5 mb-4 flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-semibold ${tierPalette.text}`}>
                  {getTierDisplayName(customer.loyalty_stage, rewardsConfig)}
                </p>
                <p className="text-xs text-muted-foreground">Current tier</p>
              </div>
              <span className={`text-lg font-bold ${tierPalette.text}`}>{customer.cashback_rate ?? 0}%</span>
            </div>

            {tierHistory.length > 0 ? (
              <div className="space-y-0">
                {tierHistory.map((change, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    {i < tierHistory.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/50" />
                    )}
                    <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowUpRight className="h-3 w-3 text-amber-400" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-foreground">
                        {change.from} <span className="text-muted-foreground mx-1">&rarr;</span> {change.to}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(change.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {change.cashbackRate != null && ` · ${change.cashbackRate}% cashback`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Joined as {getTierDisplayName(customer.loyalty_stage, rewardsConfig)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {memberSince.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Transactions
              {filteredTransactions.length !== (transactions?.length ?? 0) && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  {filteredTransactions.length} of {transactions?.length}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
              {([
                { value: '7d' as DatePreset, label: '7d' },
                { value: '30d' as DatePreset, label: '30d' },
                { value: '90d' as DatePreset, label: '90d' },
                { value: 'all' as DatePreset, label: 'All' },
              ] as const).map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setTxDatePreset(preset.value)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    txDatePreset === preset.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredTransactions.length ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {transactions?.length ? 'No transactions in this period' : 'No transactions yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                      tx.type === 'referral_commission'
                        ? 'bg-blue-500/10 text-blue-400'
                        : tx.type === 'credit' || tx.type === 'cashback'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'credit' || tx.type === 'cashback' || tx.type === 'referral_commission' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description ?? TRANSACTION_LABELS[tx.type] ?? tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {TRANSACTION_LABELS[tx.type] ?? tx.type} &middot; {new Date(tx.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} {new Date(tx.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    tx.type === 'referral_commission' ? 'text-blue-400' : tx.type === 'credit' || tx.type === 'cashback' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'credit' || tx.type === 'cashback' || tx.type === 'referral_commission' ? '+' : '-'}
                    {formatAmount(Math.abs(Number(tx.amount)), currencyConfig)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Camera, Check, ChevronRight, Circle, CircleCheck, CircleDashed, CircleX,
  Clock, Copy, CreditCard, Gift, Loader2, MessageCircle,
  Share2, Smartphone, Sparkles, TrendingUp, Trophy, Users, Wallet, Zap,
} from 'lucide-react'
import { APP_URL } from '@/lib/constants'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'
import { getLoyaltyTranslations } from '@/lib/loyalty-translations'
import type { LoyaltyTranslations } from '@/lib/loyalty-translations'
import type { RewardsConfig, Referral, Transaction } from '@/types/database'
import { getReferralUnlockTier, computeReferralMilestones } from '@/types/database'

type Props = {
  memberId: string
  avatarUrl: string | null
  customer: {
    id: string
    name: string
    balance: number
    cashback_rate: number | null
    loyalty_stage: string
    referral_code: string | null
    referral_count: number
  }
  studio: { id: string; name: string; slug: string }
  branding: Record<string, unknown>
  logoUrl: string | null
  rewardsConfig: RewardsConfig
  referrals: (Referral & { referred_customer: { name: string; has_purchased: boolean; metadata: Record<string, unknown> | null } })[]
  transactions: Transaction[]
  currency: string
  language: string
}

function timeAgo(dateStr: string, t: LoyaltyTranslations): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return t.justNow
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t.minutesAgo(minutes)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t.hoursAgo(hours)
  const days = Math.floor(hours / 24)
  if (days < 30) return t.daysAgo(days)
  const months = Math.floor(days / 30)
  return t.monthsAgo(months)
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

type ReferralStep = {
  label: string
  done: boolean
  failed?: boolean
}

function getReferralSteps(
  status: 'pending' | 'activated' | 'expired',
  t: LoyaltyTranslations,
  triggerText: string,
  referredCustomer?: { has_purchased: boolean; metadata: Record<string, unknown> | null },
): ReferralStep[] {
  const passDownloaded = !!referredCustomer?.metadata?.pass_downloaded

  const steps: ReferralStep[] = [
    { label: t.signUp, done: false },
    { label: t.addWalletPass, done: false },
    { label: triggerText, done: false },
  ]

  if (status === 'activated') {
    return steps.map(s => ({ ...s, done: true }))
  }

  if (status === 'pending') {
    steps[0].done = true
    steps[1].done = passDownloaded
    return steps
  }

  // expired
  steps[0].done = true
  steps[1] = { ...steps[1], done: passDownloaded, failed: !passDownloaded }
  steps[2] = { ...steps[2], failed: true }
  return steps
}

function getTierUpgradeActionText(
  trigger: { type: string; threshold?: number },
  t: LoyaltyTranslations,
  formattedThreshold?: string,
): string {
  switch (trigger.type) {
    case 'first_purchase': return t.doFirstPurchase
    case 'first_full_payment': return t.doFirstFullPayment
    case 'total_spend': return t.doTotalSpend(formattedThreshold ?? String(trigger.threshold ?? 0))
    case 'referral_count': return t.doReferralCount(trigger.threshold ?? 1)
    case 'days_member': return t.doDaysMember(trigger.threshold ?? 1)
    default: return t.doFirstPurchase
  }
}

function getActivationTriggerText(
  trigger: RewardsConfig['referrals']['activation_trigger'],
  t: LoyaltyTranslations,
  formattedThreshold?: string,
): string {
  switch (trigger.type) {
    case 'first_purchase':
      return t.makesFirstPurchase
    case 'first_full_payment':
      return t.completesFirstFullPayment
    case 'total_spend':
      return t.spendsAmount(formattedThreshold ?? String(trigger.threshold ?? 0))
    default:
      return t.completesQualifyingAction
  }
}

function resizeToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const size = 200
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/webp',
        0.85,
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const TRANSACTION_ICONS: Record<string, { icon: typeof CreditCard; color: string }> = {
  credit: { icon: CreditCard, color: 'text-emerald-500' },
  debit: { icon: Wallet, color: 'text-red-500' },
  cashback: { icon: Sparkles, color: 'text-amber-500' },
  referral_commission: { icon: Users, color: 'text-violet-500' },
  adjustment: { icon: TrendingUp, color: 'text-blue-500' },
}

const POSITIVE_TYPES = new Set(['credit', 'cashback', 'referral_commission'])

type TxDisplayRow = {
  id: string
  type: string
  amount: number
  cashbackAmount?: number
  description: string | null
  created_at: string
}

function groupTransactions(txs: Transaction[]): TxDisplayRow[] {
  const rows: TxDisplayRow[] = []
  const used = new Set<string>()

  for (const tx of txs) {
    if (used.has(tx.id)) continue
    if (tx.type === 'debit') { used.add(tx.id); continue } // debit is absorbed into its credit

    if (tx.type === 'credit') {
      // Find matching debit and cashback within same second
      const sec = tx.created_at.slice(0, 19)
      const cashbackTx = txs.find(
        t => !used.has(t.id) && t.id !== tx.id && t.type === 'cashback' && t.created_at.slice(0, 19) === sec
      )
      if (cashbackTx) used.add(cashbackTx.id)
      const debitTx = txs.find(
        t => !used.has(t.id) && t.id !== tx.id && t.type === 'debit' && t.created_at.slice(0, 19) === sec
      )
      if (debitTx) used.add(debitTx.id)

      used.add(tx.id)
      rows.push({
        id: tx.id,
        type: 'credit',
        amount: tx.amount,
        cashbackAmount: cashbackTx ? cashbackTx.amount : undefined,
        description: tx.description,
        created_at: tx.created_at,
      })
    } else {
      used.add(tx.id)
      rows.push({ id: tx.id, type: tx.type, amount: tx.amount, description: tx.description, created_at: tx.created_at })
    }
  }

  return rows
}

export function LoyaltyHub({ memberId, avatarUrl, customer, studio, branding, logoUrl, rewardsConfig, referrals, transactions, currency, language }: Props) {
  const [copied, setCopied] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<
    (Referral & { referred_customer: { name: string; has_purchased: boolean; metadata: Record<string, unknown> | null } }) | null
  >(null)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(avatarUrl)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = getLoyaltyTranslations(language)
  const brandColor = (branding?.brandColor as string) || '#6366f1'
  const cashbackRate = Number(customer.cashback_rate ?? rewardsConfig.tiers[0].cashback_rate)
  const referralLink = customer.referral_code
    ? `${APP_URL}/refer/${memberId}`
    : null
  const currencyConfig = getCurrencyConfig(currency)

  const referralUnlockTier = getReferralUnlockTier(rewardsConfig)
  const customerTierIdx = rewardsConfig.tiers.findIndex(t => t.slug === customer.loyalty_stage)
  const referralUnlockIdx = referralUnlockTier ? rewardsConfig.tiers.findIndex(t => t.slug === referralUnlockTier.slug) : -1
  const isEligibleForReferrals = customerTierIdx >= referralUnlockIdx && referralUnlockIdx >= 0
  const maxRate = rewardsConfig.referrals.referrer_cashback_cap
  const isMaxed = cashbackRate >= maxRate

  // Referral stats
  const activatedCount = referrals.filter(r => r.status === 'activated').length
  const pendingCount = referrals.filter(r => r.status === 'pending').length
  const totalEarned = referrals.reduce((sum, r) => sum + Number(r.total_commission_earned), 0)

  // Milestone progression
  const milestones = computeReferralMilestones(rewardsConfig)
  const currentMilestoneIdx = milestones.findIndex(m => m.rate >= cashbackRate)

  // Sorted referrals
  const sortedReferrals = [...referrals].sort((a, b) => {
    const order: Record<string, number> = { activated: 0, pending: 1, expired: 2 }
    return (order[a.status] ?? 3) - (order[b.status] ?? 3)
  })

  const bonusPerRef = rewardsConfig.referrals.referrer_cashback_bonus_per_ref
  const showReferralSection = isEligibleForReferrals && rewardsConfig.referrals.enabled
  const friendRate = rewardsConfig.referrals.friend_cashback_rate
  const welcomeBonus = rewardsConfig.referrals.friend_welcome_bonus
  const commissionRate = rewardsConfig.referrals.referrer_commission_rate
  const commissionDays = rewardsConfig.referrals.referrer_commission_duration_days

  // Scarcity: rolling end-of-month countdown
  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const shareMessage = t.shareMessage(studio.name, friendRate, welcomeBonus, referralLink ?? '')

  const handleCopy = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({ text: shareMessage })
      } catch {
        handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const blob = await resizeToSquare(file)
      const form = new FormData()
      form.append('avatar', blob, 'avatar.webp')
      const res = await fetch(`/api/loyalty/${memberId}/avatar`, { method: 'POST', body: form })
      if (res.ok) {
        const { avatar_url } = await res.json()
        setAvatarSrc(avatar_url)
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Next milestone
  const nextMilestone = milestones.find(m => m.rate > cashbackRate)
  const friendsNeededForNext = nextMilestone
    ? nextMilestone.friends - activatedCount
    : 0

  // Next tier upgrade path
  const nextTier = customerTierIdx >= 0 ? rewardsConfig.tiers[customerTierIdx + 1] : rewardsConfig.tiers[1]
  const nextTierTrigger = nextTier?.upgrade_trigger
  const nextTierThreshold = nextTierTrigger?.threshold
    ? formatAmount(nextTierTrigger.threshold, currencyConfig)
    : undefined
  const nextTierActionText = nextTierTrigger
    ? getTierUpgradeActionText(nextTierTrigger, t, nextTierThreshold)
    : null

  const trigger = rewardsConfig.referrals.activation_trigger
  const formattedThreshold = trigger.threshold
    ? formatAmount(trigger.threshold, currencyConfig)
    : undefined
  const triggerText = getActivationTriggerText(trigger, t, formattedThreshold)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-8 space-y-5">
        {/* ===== 1. HEADER ===== */}
        <div className="text-center space-y-3">
          {/* Studio × You avatars */}
          <div className="flex items-center justify-center">
            {/* Studio logo */}
            <div
              className="relative z-10 h-16 w-16 shrink-0 rounded-full border-2 border-background overflow-hidden bg-secondary flex items-center justify-center"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={studio.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {getInitials(studio.name)}
                </span>
              )}
            </div>

            {/* × separator */}
            <span className="relative z-20 -mx-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground shadow-sm border border-border">
              ×
            </span>

            {/* Customer avatar (tappable) */}
            <div className="relative z-10">
              <button
                type="button"
                className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t.changePhoto}
              >
                {uploading ? (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                  >
                    {getInitials(customer.name)}
                  </div>
                )}
              </button>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-secondary">
                <Camera className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div>
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-sm text-muted-foreground">{studio.name}</span>
              <span className="text-muted-foreground/40">·</span>
              <Badge style={{ backgroundColor: brandColor, color: '#fff' }}>
                {customer.loyalty_stage.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* ===== 2. QUICK STATS ===== */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-xl">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: brandColor }}>{cashbackRate}%</p>
              <p className="text-xs text-muted-foreground">{t.cashback}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{formatAmount(customer.balance, currencyConfig)}</p>
              <p className="text-xs text-muted-foreground">{t.balance}</p>
            </CardContent>
          </Card>
        </div>

        {/* ===== 3. REWARDS HERO (redesigned) ===== */}
        {showReferralSection && (
          <div
            className="rounded-xl overflow-hidden p-6 text-center space-y-4"
            style={{ background: `linear-gradient(135deg, ${brandColor}22, ${brandColor}08)` }}
          >

            {isMaxed ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-7 w-7 text-amber-400" />
                  <h2 className="text-2xl font-bold">{t.maximumCashback}</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.keepSharing(cashbackRate)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight">
                  {t.inviteFriendsTitle}
                </h2>

                {/* Value props inside hero */}
                {bonusPerRef === 0 && commissionRate === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t.earnRewardsGeneric}
                  </p>
                ) : (
                  <div className="space-y-2 text-left max-w-[280px] mx-auto">
                    {bonusPerRef > 0 && (
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: brandColor }} />
                        <p className="text-sm">
                          <span className="font-bold" style={{ color: brandColor }}>{t.permanentCashback(bonusPerRef)}</span>
                          <br />
                          <span className="text-muted-foreground">{t.forEachFriend}</span>
                        </p>
                      </div>
                    )}
                    {commissionRate > 0 && (
                      <div className="flex items-start gap-2.5">
                        <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" style={{ color: brandColor }} />
                        <p className="text-sm">
                          <span className="font-bold" style={{ color: brandColor }}>{t.friendSpend(commissionRate)}</span>
                          <br />
                          <span className="text-muted-foreground">
                            {commissionDays === 0 ? t.forUnlimitedTime : t.forDays(commissionDays)}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Primary CTA */}
            {referralLink && (
              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                style={{ backgroundColor: brandColor }}
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
                {t.inviteFriendsButton}
              </Button>
            )}
          </div>
        )}

        {/* ===== 4. WHAT YOUR FRIEND GETS ===== */}
        {showReferralSection && (
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">{t.whatYourFriendGets}</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${brandColor}15` }}
                  >
                    <TrendingUp className="h-4 w-4" style={{ color: brandColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.cashbackFromDayOne(friendRate)}</p>
                    <p className="text-xs text-muted-foreground">{t.earnBackOnEveryPurchase}</p>
                  </div>
                </div>
                {welcomeBonus > 0 && (
                  <div className="flex items-start gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${brandColor}15` }}
                    >
                      <Gift className="h-4 w-4" style={{ color: brandColor }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.welcomeBonus(welcomeBonus, currencyConfig.symbol)}</p>
                      <p className="text-xs text-muted-foreground">{t.addedToBalance}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${brandColor}15` }}
                  >
                    <Wallet className="h-4 w-4" style={{ color: brandColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.digitalLoyaltyCard}</p>
                    <p className="text-xs text-muted-foreground">{t.savedToWallet}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 5. HOW REFERRALS WORK (stepper) ===== */}
        {showReferralSection && (
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">{t.howReferralsWork}</p>
              <div className="space-y-0">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <CircleCheck className="h-5 w-5 text-emerald-500" />
                    <div className="w-px h-4 bg-border" />
                  </div>
                  <p className="text-sm pt-0.5">{t.shareYourLinkStep}</p>
                </div>
                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <CircleCheck className="h-5 w-5 text-emerald-500" />
                    <div className="w-px h-4 bg-border" />
                  </div>
                  <p className="text-sm pt-0.5">{t.friendSignsUp}</p>
                </div>
                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm pt-0.5 text-muted-foreground">{triggerText}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.onceComplete}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===== 6. SHARE YOUR LINK ===== */}
        {showReferralSection && referralLink && (
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">{t.shareYourLink}</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={referralLink}
                  className="text-xs truncate"
                  onClick={handleCopy}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-center text-emerald-500 -mt-1">{t.copied}</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="gap-1.5 text-xs" asChild>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" className="gap-1.5 text-xs" asChild>
                  <a href={`sms:?body=${encodeURIComponent(shareMessage)}`}>
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    SMS
                  </a>
                </Button>
                <Button variant="outline" className="gap-1.5 text-xs" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 7. CASHBACK PROGRESSION ===== */}
        {showReferralSection && milestones.length > 1 && (
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.cashbackProgression}</p>
                <span className="text-lg font-bold" style={{ color: brandColor }}>{cashbackRate}%</span>
              </div>

              {/* Milestone track */}
              <div className="relative px-2">
                <div className="absolute top-3 left-2 right-2 h-0.5 bg-secondary" />
                <div
                  className="absolute top-3 left-2 h-0.5 transition-all duration-500"
                  style={{
                    backgroundColor: brandColor,
                    width: milestones.length > 1
                      ? `${Math.min((currentMilestoneIdx / (milestones.length - 1)) * 100, 100)}%`
                      : '0%',
                  }}
                />
                <div className="relative flex justify-between">
                  {milestones.map((m, i) => {
                    const isAchieved = m.rate <= cashbackRate
                    const isCurrent = i === currentMilestoneIdx
                    return (
                      <div key={i} className="flex flex-col items-center" style={{ width: 0 }}>
                        <div
                          className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: isAchieved ? brandColor : 'var(--background)',
                            borderColor: isAchieved || isCurrent ? brandColor : 'var(--border)',
                            boxShadow: isCurrent ? `0 0 0 3px ${brandColor}33` : undefined,
                          }}
                        >
                          {isAchieved && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="mt-1.5 text-[10px] text-muted-foreground whitespace-nowrap">
                          {m.rate}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="text-center space-y-0.5">
                {isMaxed ? (
                  <div className="flex items-center justify-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <p className="text-sm font-medium text-amber-400">{t.maximumCashbackReached}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t.youveReferred(activatedCount)}
                    </p>
                    {nextMilestone && friendsNeededForNext > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t.moreToReach(friendsNeededForNext)} <span className="font-semibold" style={{ color: brandColor }}>{nextMilestone.rate}%</span>
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* How to earn more */}
              {!isMaxed && (nextTierActionText || (rewardsConfig.referrals.enabled && bonusPerRef > 0)) && (
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t.howToEarnMore}</p>
                  <div className="space-y-2">
                    {nextTierActionText && nextTier && (
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-muted-foreground flex-1">{nextTierActionText}</span>
                        <span className="font-semibold shrink-0" style={{ color: brandColor }}>{t.upgradeToRate(nextTier.cashback_rate)}</span>
                      </div>
                    )}
                    {rewardsConfig.referrals.enabled && bonusPerRef > 0 && (
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium" style={{ color: brandColor }}>{t.inviteAndBoost(bonusPerRef)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== 8. RECENT ACTIVITY ===== */}
        <Card className="rounded-xl">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t.recentActivity}</p>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t.noActivityYet}</p>
            ) : (
              <div className="space-y-1">
                {groupTransactions(transactions).map((tx) => {
                  const iconConfig = TRANSACTION_ICONS[tx.type] ?? TRANSACTION_ICONS.adjustment
                  const Icon = iconConfig.icon
                  const isPositive = POSITIVE_TYPES.has(tx.type)
                  const label = t.transactionLabels[tx.type] ?? tx.type

                  return (
                    <div key={tx.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-secondary/50">
                        <Icon className={`h-4 w-4 ${iconConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {tx.cashbackAmount
                            ? `+${formatAmount(tx.cashbackAmount, currencyConfig)} cashback · ${timeAgo(tx.created_at, t)}`
                            : timeAgo(tx.created_at, t)
                          }
                        </p>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : '-'}{formatAmount(Math.abs(tx.amount), currencyConfig)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== 9. REFERRAL HISTORY (clickable) ===== */}
        {sortedReferrals.length > 0 && (
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-4">
              {/* Earnings summary */}
              <div className="rounded-lg bg-secondary/50 p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground">{t.youveEarned}</p>
                <p className="text-3xl font-bold">{formatAmount(Math.round(totalEarned), currencyConfig)}</p>
                <p className="text-xs text-muted-foreground">
                  {t.fromReferrals(activatedCount, pendingCount)}
                </p>
              </div>

              {/* Individual referrals */}
              <div className="space-y-2">
                {sortedReferrals.map((ref) => (
                  <button
                    key={ref.id}
                    className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2.5 w-full text-left cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => setSelectedReferral(ref)}
                  >
                    {/* Avatar with initials */}
                    <div className="relative shrink-0">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                      >
                        {ref.referred_customer?.name ? getInitials(ref.referred_customer.name) : '?'}
                      </div>
                      {ref.status === 'activated' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ref.referred_customer?.name || 'Unknown'}</p>
                      <p
                        className="text-[11px]"
                        style={{
                          color:
                            ref.status === 'activated' ? '#22c55e' :
                            ref.status === 'pending' ? '#f59e0b' :
                            '#9ca3af',
                        }}
                      >
                        {ref.status === 'activated'
                          ? `${t.completedStatus} · ${timeAgo(ref.activated_at || ref.created_at, t)}`
                          : ref.status === 'pending'
                          ? t.waitingForFirstVisit
                          : t.expiredStatus
                        }
                      </p>
                    </div>

                    {/* Earned amount + chevron */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ref.status === 'activated' && Number(ref.total_commission_earned) > 0 && (
                        <span className="text-sm font-semibold text-emerald-500">
                          +{formatAmount(Number(ref.total_commission_earned), currencyConfig)}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 10. REFERRAL DETAIL SHEET ===== */}
        <Sheet open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto" showCloseButton={false}>
            {selectedReferral && (() => {
              const ref = selectedReferral
              const name = ref.referred_customer?.name || 'Unknown'
              const steps = getReferralSteps(ref.status, t, triggerText, ref.referred_customer)
              const totalCommission = Number(ref.total_commission_earned)

              return (
                <>
                  {/* Drag handle */}
                  <div className="flex justify-center pt-2 pb-0">
                    <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                  </div>

                  <SheetHeader className="items-center text-center pb-0">
                    {/* Large avatar */}
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center text-lg font-bold mx-auto"
                      style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                    >
                      {getInitials(name)}
                    </div>
                    <SheetTitle className="text-lg">{name}</SheetTitle>
                    <Badge
                      variant={ref.status === 'activated' ? 'default' : 'secondary'}
                      className={
                        ref.status === 'activated'
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10'
                          : ref.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {ref.status === 'activated' ? t.completedStatus : ref.status === 'pending' ? t.pendingStatus : t.expiredStatus}
                    </Badge>
                  </SheetHeader>

                  <div className="px-4 pb-6 space-y-4">
                    <Separator />

                    {/* Status-specific summary */}
                    <p className="text-sm text-center text-muted-foreground">
                      {ref.status === 'activated'
                        ? t.earnedFromReferral(formatAmount(totalCommission, currencyConfig))
                        : ref.status === 'pending'
                        ? t.waitingForActivation(name)
                        : t.thisReferralExpired
                      }
                    </p>

                    <Separator />

                    {/* Step checklist */}
                    <div className="space-y-0">
                      <p className="text-sm font-semibold mb-3">{t.stepsToComplete}</p>
                      {steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            {step.done ? (
                              <CircleCheck className="h-5 w-5 text-emerald-500" />
                            ) : step.failed ? (
                              <CircleX className="h-5 w-5 text-red-400" />
                            ) : (
                              <CircleDashed className="h-5 w-5 text-muted-foreground" />
                            )}
                            {i < steps.length - 1 && <div className="w-px h-4 bg-border" />}
                          </div>
                          <p className={`text-sm pt-0.5 ${step.failed ? 'line-through text-muted-foreground' : step.done ? '' : 'text-muted-foreground'}`}>
                            {step.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Timestamps */}
                    <p className="text-xs text-muted-foreground text-center">
                      {t.referredTimeAgo(timeAgo(ref.created_at, t))}
                      {ref.activated_at && ` · ${t.activatedTimeAgo(timeAgo(ref.activated_at, t))}`}
                    </p>
                  </div>
                </>
              )
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

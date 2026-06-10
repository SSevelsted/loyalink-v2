import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import {
  studioWelcomeEmail,
  trialWarningEmail,
  trialExpiredEmail,
  subscriptionConfirmedEmail,
  customerWelcomeEmail,
  passReminderEmail,
  passRemovedEmail,
  transactionReceiptEmail,
  resendPassLinkEmail,
  tierUpgradeEmail,
  referralRewardEmail,
  winBackEmail,
} from '@/lib/email/templates'

type Preview = {
  id: string
  audience: 'Studio owner' | 'Customer'
  category: 'Transactional' | 'Sales / re-engagement'
  description: string
  subject: string
  html: string
}

function buildPreviews(): Preview[] {
  return [
    {
      id: 'studio-welcome',
      audience: 'Studio owner',
      category: 'Transactional',
      description: 'After studio signs up — confirms plan + trial end date',
      ...studioWelcomeEmail({
        ownerName: 'Simon',
        studioName: 'StreamInk Studio',
        planLabel: 'Pro',
        trialEnd: '23 June 2026',
        setupUrl: 'https://my.loyalink.ai/setup',
      }),
    },
    {
      id: 'trial-warning-5d',
      audience: 'Studio owner',
      category: 'Sales / re-engagement',
      description: 'Trial expires in 5 days — agency studios skipped',
      ...trialWarningEmail({
        ownerName: 'Simon',
        studioName: 'StreamInk Studio',
        planLabel: 'Pro',
        daysLeft: 5,
        hasPaymentMethod: false,
        customerCount: 42,
        totalBalance: 1280,
        transactionCount: 137,
        trialEndDate: '14 June 2026',
        currency: 'kr',
        dashboardUrl: 'https://my.loyalink.ai/dashboard',
        billingUrl: 'https://my.loyalink.ai/settings?tab=billing',
      }),
    },
    {
      id: 'trial-warning-1d',
      audience: 'Studio owner',
      category: 'Sales / re-engagement',
      description: 'Trial expires tomorrow — agency studios skipped',
      ...trialWarningEmail({
        ownerName: 'Simon',
        studioName: 'StreamInk Studio',
        planLabel: 'Pro',
        daysLeft: 1,
        hasPaymentMethod: true,
        customerCount: 42,
        totalBalance: 1280,
        transactionCount: 137,
        trialEndDate: '10 June 2026',
        currency: 'kr',
        dashboardUrl: 'https://my.loyalink.ai/dashboard',
        billingUrl: 'https://my.loyalink.ai/settings?tab=billing',
      }),
    },
    {
      id: 'trial-expired',
      audience: 'Studio owner',
      category: 'Sales / re-engagement',
      description: 'Day after trial ended without subscription — agency studios skipped',
      ...trialExpiredEmail({
        ownerName: 'Simon',
        billingUrl: 'https://my.loyalink.ai/settings?tab=billing',
      }),
    },
    {
      id: 'subscription-confirmed',
      audience: 'Studio owner',
      category: 'Transactional',
      description: 'First successful subscription payment',
      ...subscriptionConfirmedEmail({
        ownerName: 'Simon',
        studioName: 'StreamInk Studio',
        planLabel: 'Pro',
        isPro: true,
        automationsUrl: 'https://my.loyalink.ai/notifications/automations',
      }),
    },
    {
      id: 'customer-welcome',
      audience: 'Customer',
      category: 'Transactional',
      description: 'New customer joined the loyalty program',
      ...customerWelcomeEmail({
        customerName: 'Anna Jensen',
        studioName: 'StreamInk Studio',
        cashbackRate: 5,
        balance: 0,
        tierName: 'Bronze',
        currency: 'kr',
        passInstalled: false,
        passLink: 'https://my.loyalink.ai/loyalty/sample?addPass=1&token=demo',
      }),
    },
    {
      id: 'pass-reminder',
      audience: 'Customer',
      category: 'Sales / re-engagement',
      description: '24–48h after signup if wallet pass not installed — agency studios skipped',
      ...passReminderEmail({
        customerName: 'Anna Jensen',
        studioName: 'StreamInk Studio',
        cashbackRate: 5,
        passLink: 'https://my.loyalink.ai/loyalty/sample?addPass=1&token=demo',
      }),
    },
    {
      id: 'pass-removed',
      audience: 'Customer',
      category: 'Transactional',
      description: 'Apple/Google wallet reports pass was removed',
      ...passRemovedEmail({
        customerName: 'Anna Jensen',
        studioName: 'StreamInk Studio',
        currentBalance: 145,
        cashbackRate: 5,
        currency: 'kr',
        passLink: 'https://my.loyalink.ai/loyalty/sample?addPass=1&token=demo',
      }),
    },
    {
      id: 'transaction-receipt',
      audience: 'Customer',
      category: 'Transactional',
      description: 'After every recorded transaction — most-sent customer email',
      ...transactionReceiptEmail({
        customerName: 'Anna Jensen',
        studioName: 'StreamInk Studio',
        currency: 'kr',
        amount: 450,
        balanceUsed: 50,
        chargeOnPOS: 400,
        cashbackEarned: 22.5,
        cashbackRate: 5,
        newBalance: 117.5,
        tierName: 'Bronze',
        tierUpgraded: false,
        nextTierName: 'Silver',
        nextTierRate: 7,
        amountToNextTier: 550,
      }),
    },
    {
      id: 'resend-pass-link',
      audience: 'Customer',
      category: 'Transactional',
      description: 'Customer requested pass link from duplicate-email flow',
      ...resendPassLinkEmail({
        customerName: 'Anna Jensen',
        studioName: 'StreamInk Studio',
        passLink: 'https://my.loyalink.ai/loyalty/sample?addPass=1&token=demo',
      }),
    },
    {
      id: 'tier-upgrade',
      audience: 'Customer',
      category: 'Transactional',
      description: 'Customer crossed a tier threshold',
      ...tierUpgradeEmail({
        customerName: 'Anna Jensen',
        studioName: 'StreamInk Studio',
        newTierName: 'Silver',
        newCashbackRate: 7,
        oldCashbackRate: 5,
        balance: 117.5,
        lifetimeCashback: 540,
        currency: 'kr',
      }),
    },
    {
      id: 'referral-reward',
      audience: 'Customer',
      category: 'Transactional',
      description: 'Referrer earned a reward from someone they invited',
      ...referralRewardEmail({
        referrerName: 'Anna Jensen',
        referredName: 'Peter Madsen',
        studioName: 'StreamInk Studio',
        rewardAmount: 50,
        newBalance: 167.5,
        currency: 'kr',
      }),
    },
    {
      id: 'win-back',
      audience: 'Customer',
      category: 'Sales / re-engagement',
      description: 'Inactivity automation — agency studios skipped',
      ...winBackEmail({
        customerName: 'Anna Jensen',
        studioName: 'StreamInk Studio',
        balance: 117.5,
        currency: 'kr',
        hasCashbackBoost: true,
        boostedRate: 10,
        normalRate: 5,
        boostExpiry: '23 June 2026',
        balanceLink: 'https://my.loyalink.ai/loyalty/sample?token=demo',
      }),
    },
  ]
}

export default async function AdminEmailsPage() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: membership } = await admin
    .from('studio_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    )
  }

  const previews = buildPreviews()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Email previews
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All {previews.length} Resend templates rendered with sample data. Auth/security emails (signup confirm, magic link, etc.) are sent by Supabase and not shown here.
        </p>
      </div>

      <div className="grid gap-6">
        {previews.map((p) => (
          <section key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <header className="px-5 py-4 border-b border-border flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-foreground">{p.id}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {p.audience}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.category === 'Transactional'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}
                  >
                    {p.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{p.description}</p>
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Subject: </span>
                  <span className="font-medium">{p.subject}</span>
                </p>
              </div>
            </header>
            <div className="bg-neutral-100 dark:bg-neutral-900 p-4">
              <iframe
                title={`${p.id} preview`}
                srcDoc={p.html}
                sandbox=""
                className="w-full h-[640px] bg-white rounded-md border border-border"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

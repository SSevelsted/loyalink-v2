import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JoinForm } from '@/components/landing/join-form'
import { Badge } from '@/components/ui/badge'
import { Clock, Shield, Smartphone, Users } from 'lucide-react'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import { getCurrencyConfig, formatAmount } from '@/lib/currency'

type Props = {
  params: Promise<{ memberId: string }>
}

export default async function ReferralLandingPage({ params }: Props) {
  const { memberId } = await params
  const supabase = await createClient()

  // Look up the referrer customer
  let customer
  const { data: byMemberId } = await supabase
    .from('customers')
    .select('id, name, referral_code, studio_id, metadata, studios:studio_id(id, name, slug, settings)')
    .eq('member_id', memberId)
    .single()

  if (byMemberId) {
    customer = byMemberId
  } else {
    const { data: byId } = await supabase
      .from('customers')
      .select('id, name, referral_code, studio_id, metadata, studios:studio_id(id, name, slug, settings)')
      .eq('id', memberId)
      .single()
    customer = byId
  }

  if (!customer || !customer.referral_code) notFound()

  const studio = customer.studios as unknown as { id: string; name: string; slug: string; settings: Record<string, unknown> } | null
  if (!studio) notFound()

  const studioSettings = studio.settings ?? {}
  const rewardsConfig: RewardsConfig = studioSettings.rewards_config
    ? migrateRewardsConfig(studioSettings.rewards_config)
    : DEFAULT_REWARDS_CONFIG
  const currency = (studioSettings.currency as string) ?? 'dkk'
  const currencyCfg = getCurrencyConfig(currency)

  // Get landing page for branding
  const { data: landingPage } = await supabase
    .from('studio_landing_pages')
    .select('id, settings, hero_image_url')
    .eq('studio_id', customer.studio_id)
    .limit(1)
    .single()

  const settings = (landingPage?.settings ?? {}) as {
    brandColor?: string
    backgroundColor?: string
    textColor?: string
    logoUrl?: string | null
    buttonText?: string
    showPhone?: boolean
    showEmail?: boolean
  }

  // Get member count for social proof
  const { count: memberCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', customer.studio_id)

  const bgColor = settings.backgroundColor || undefined
  const txtColor = settings.textColor || undefined
  const logoSrc = settings.logoUrl || landingPage?.hero_image_url
  const referrerAvatar = ((customer.metadata as Record<string, unknown>)?.avatar_url as string) ?? null

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <div className="mx-auto max-w-lg px-4 py-16 space-y-8">
        {referrerAvatar ? (
          <div className="flex items-center justify-center">
            {/* Studio logo */}
            <div className="relative z-10 h-24 w-24 shrink-0 rounded-full border-2 border-background overflow-hidden bg-secondary flex items-center justify-center">
              {logoSrc ? (
                <img src={logoSrc} alt={studio.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {studio.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              )}
            </div>
            {/* × separator */}
            <span className="relative z-20 -mx-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground shadow-sm border border-border">
              ×
            </span>
            {/* Referrer avatar */}
            <div className="relative z-10 h-24 w-24 shrink-0 rounded-full border-2 border-background overflow-hidden">
              <img src={referrerAvatar} alt={customer.name} className="h-full w-full object-cover" />
            </div>
          </div>
        ) : logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            className="mx-auto h-24 w-24 rounded-full object-cover"
          />
        ) : null}

        <div className="text-center space-y-3">
          <Badge
            className="text-sm px-4 py-1"
            style={settings.brandColor ? { backgroundColor: settings.brandColor, color: '#fff' } : undefined}
          >
            Referred by {customer.name}
          </Badge>
          <h1 className="text-3xl font-bold" style={txtColor ? { color: txtColor } : undefined}>
            {studio.name} Loyalty Program
          </h1>
          <p style={txtColor ? { color: txtColor, opacity: 0.7 } : undefined} className="text-muted-foreground">
            Sign up and get {rewardsConfig.referrals.friend_cashback_rate}% cashback{rewardsConfig.referrals.friend_welcome_bonus > 0 ? ` + ${formatAmount(rewardsConfig.referrals.friend_welcome_bonus, currencyCfg)} welcome bonus` : ''}
          </p>
        </div>

        {/* Trust signs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: Shield, label: 'Free forever' },
            { icon: Clock, label: '30 seconds' },
            ...(memberCount && memberCount > 1
              ? [{ icon: Users, label: `${memberCount}+ members` }]
              : []),
            { icon: Smartphone, label: 'No app needed' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"
            >
              <Icon className="h-3.5 w-3.5" style={{ color: settings.brandColor }} />
              <span className="text-xs font-medium" style={txtColor ? { color: txtColor } : undefined}>{label}</span>
            </div>
          ))}
        </div>

        <JoinForm
          studioId={customer.studio_id}
          landingPageId={landingPage?.id ?? ''}
          brandColor={settings.brandColor}
          backgroundColor={bgColor}
          textColor={txtColor}
          buttonText={settings.buttonText || 'Join & Get Your Bonus'}
          showEmail={settings.showEmail ?? true}
          showPhone={settings.showPhone ?? true}
          referralCode={customer.referral_code}
        />
      </div>
    </div>
  )
}

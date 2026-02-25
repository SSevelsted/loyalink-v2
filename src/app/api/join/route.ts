import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import { customAlphabet } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

export async function POST(request: NextRequest) {
  try {
    const { studioId, landingPageId, name, email, phone, platform, referralCode, customFields } = await request.json()

    if (!studioId || !name) {
      return NextResponse.json({ error: 'studioId and name are required' }, { status: 400 })
    }

    // Fetch rewards config
    const { data: studio } = await supabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single()

    const settings = studio?.settings as Record<string, unknown> | null
    const config: RewardsConfig = settings?.rewards_config
      ? migrateRewardsConfig(settings.rewards_config)
      : DEFAULT_REWARDS_CONFIG

    // Determine initial cashback rate and tier
    let cashbackRate = config.tiers[0].cashback_rate
    let loyaltyStage = config.tiers[0].slug
    let referrerCustomerId: string | null = null

    // Check referral code
    if (referralCode && config.referrals.enabled) {
      const { data: referrer } = await supabase
        .from('customers')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .eq('studio_id', studioId)
        .single()

      if (referrer) {
        referrerCustomerId = referrer.id
        cashbackRate = config.referrals.friend_cashback_rate
        loyaltyStage = config.referrals.friend_tier_slug
      }
    }

    // Generate unique referral code for the new customer
    const newReferralCode = generateReferralCode()

    // Create customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .insert({
        studio_id: studioId,
        name,
        email: email || null,
        phone: phone || null,
        cashback_rate: cashbackRate,
        loyalty_stage: loyaltyStage,
        referral_code: newReferralCode,
      })
      .select('id')
      .single()

    if (custError) {
      return NextResponse.json({ error: custError.message }, { status: 500 })
    }

    // If referred, create referral row and welcome bonus
    if (referrerCustomerId && config.referrals.enabled) {
      // Create referral record
      await supabase.from('referrals').insert({
        studio_id: studioId,
        referrer_customer_id: referrerCustomerId,
        referred_customer_id: customer.id,
        referral_code: referralCode.toUpperCase(),
        status: 'pending',
      })

      // Credit welcome bonus
      if (config.referrals.friend_welcome_bonus > 0) {
        await supabase.from('transactions').insert({
          customer_id: customer.id,
          studio_id: studioId,
          type: 'credit',
          amount: config.referrals.friend_welcome_bonus,
          description: 'Welcome bonus from referral',
        })

        await supabase
          .from('customers')
          .update({ balance: config.referrals.friend_welcome_bonus })
          .eq('id', customer.id)
      }
    }

    // Update signup count
    if (landingPageId) {
      const { data: lp } = await supabase
        .from('studio_landing_pages')
        .select('signup_count')
        .eq('id', landingPageId)
        .single()

      if (lp) {
        await supabase
          .from('studio_landing_pages')
          .update({ signup_count: (lp.signup_count ?? 0) + 1 })
          .eq('id', landingPageId)
      }
    }

    // Log analytics event
    await supabase.from('analytics_events').insert({
      studio_id: studioId,
      event_type: 'landing_signup',
      customer_id: customer.id,
      metadata: {
        landing_page_id: landingPageId,
        referred_by: referrerCustomerId,
        custom_fields: customFields ?? null,
      },
    })

    // Generate pass - use the appropriate tier
    let passUrl: string | null = null
    try {
      const passRes = await fetch(`${PASS_SERVICE_URL}/api/passes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          studioId,
          platform: platform || 'apple',
        }),
      })

      if (passRes.ok) {
        const passData = await passRes.json()
        if (platform === 'google' && passData.saveUrl) {
          const su = passData.saveUrl
          const saveEndpoint = su.startsWith('http') ? su : `${PASS_SERVICE_URL}${su}`
          // Resolve intermediate endpoint to get the actual pay.google.com URL
          if (saveEndpoint.includes('pay.google.com')) {
            passUrl = saveEndpoint
          } else {
            try {
              const saveRes = await fetch(saveEndpoint)
              if (saveRes.ok) {
                const saveData = await saveRes.json()
                passUrl = saveData.saveUrl ?? saveEndpoint
              } else {
                passUrl = saveEndpoint
              }
            } catch {
              passUrl = saveEndpoint
            }
          }
        } else {
          const dl = passData.downloadUrl ?? `/api/passes/${passData.serialNumber}/download`
          passUrl = dl.startsWith('http') ? dl : `${PASS_SERVICE_URL}${dl}`
        }
      }
    } catch {
      // Pass generation failed — non-critical
    }

    // Store pass data in customer metadata so the success page can read it
    if (passUrl) {
      const { data: existing } = await supabase
        .from('customers')
        .select('metadata')
        .eq('id', customer.id)
        .single()
      const existingMetadata = (existing?.metadata as Record<string, unknown>) ?? {}
      await supabase
        .from('customers')
        .update({
          metadata: { ...existingMetadata, pass_url: passUrl, pass_platform: platform || 'apple' },
        })
        .eq('id', customer.id)
    }

    return NextResponse.json({
      customerId: customer.id,
      passUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

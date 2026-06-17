import { adminSupabase } from '@/lib/studio-access'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import { customAlphabet } from 'nanoid'
import { createCustomerAccessToken } from '@/lib/customer-access'
import { passServiceFetch } from '@/lib/pass-service'
import { APP_URL } from '@/lib/constants'
import { fireWebhook } from '@/lib/services/webhook-service'
import { sendCustomerWelcome } from '@/lib/email/send'

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

type CreateMemberInput = {
  studioId: string
  name: string
  email?: string | null
  phone?: string | null
  platform?: string
  referralCode?: string | null
  customFields?: Record<string, unknown> | null
  landingPageId?: string | null
}

type CreateMemberResult = {
  customerId: string
  passUrl: string | null
  customerAccessToken: string
}

export async function createMember(input: CreateMemberInput): Promise<CreateMemberResult> {
  const { studioId, name, email, phone, platform, referralCode, customFields, landingPageId } = input

  // Fetch rewards config
  const { data: studio } = await adminSupabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()

  const settings = studio?.settings as Record<string, unknown> | null
  const config: RewardsConfig = settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : DEFAULT_REWARDS_CONFIG

  // Check for existing customer (prevent duplicates)
  if (email) {
    const { data: existing } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId)
      .eq('email', email)
      .limit(1)
      .maybeSingle()
    if (existing) {
      throw new DuplicateMemberError('This email is already registered')
    }
  }
  if (phone) {
    const { data: existing } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId)
      .eq('phone', phone)
      .limit(1)
      .maybeSingle()
    if (existing) {
      throw new DuplicateMemberError('This phone number is already registered')
    }
  }

  // Determine initial cashback rate and tier
  let cashbackRate = config.tiers[0].cashback_rate
  let loyaltyStage = config.tiers[0].slug
  let referrerCustomerId: string | null = null
  // Referred customers inherit the referrer's market (currency/language/page).
  let referrerMarket: { currency: string | null; language: string | null; landing_page_id: string | null } | null = null

  // Check referral code
  if (referralCode && config.referrals.enabled) {
    const { data: referrer } = await adminSupabase
      .from('customers')
      .select('id, email, currency, language, landing_page_id')
      .eq('referral_code', referralCode.toUpperCase())
      .eq('studio_id', studioId)
      .single()

    if (referrer) {
      // Prevent self-referral by comparing emails
      const isSelfReferral = email && referrer.email && email.toLowerCase() === referrer.email.toLowerCase()
      if (!isSelfReferral) {
        referrerCustomerId = referrer.id
        cashbackRate = config.referrals.friend_cashback_rate
        loyaltyStage = config.referrals.friend_tier_slug
        const r = referrer as unknown as { currency: string | null; language: string | null; landing_page_id: string | null }
        referrerMarket = { currency: r.currency ?? null, language: r.language ?? null, landing_page_id: r.landing_page_id ?? null }
      }
    }
  }

  // Check if new customer is a pre-existing client (referral blocklist)
  if (referrerCustomerId && (email || phone)) {
    let blockQuery = adminSupabase
      .from('studio_pre_existing_clients')
      .select('id')
      .eq('studio_id', studioId)
      .limit(1)

    if (email && phone) {
      blockQuery = blockQuery.or(`email.eq.${email},phone.eq.${phone}`)
    } else if (email) {
      blockQuery = blockQuery.eq('email', email)
    } else {
      blockQuery = blockQuery.eq('phone', phone!)
    }

    const { data: blocked } = await blockQuery.maybeSingle()
    if (blocked) {
      referrerCustomerId = null
      cashbackRate = config.tiers[0].cashback_rate
      loyaltyStage = config.tiers[0].slug
    }
  }

  // Resolve the customer's market (currency + language + originating landing page).
  // Precedence: referrer's market (referred customers join the referrer's market) >
  // the landing page they joined through > the studio's defaults. No FX — the
  // resolved currency is locked onto the card for life.
  let resolvedCurrency = (settings?.currency as string) ?? 'dkk'
  let resolvedLanguage = (settings?.language as string) ?? 'en'
  let resolvedLandingPageId: string | null = landingPageId ?? null

  if (landingPageId) {
    const { data: lp } = await adminSupabase
      .from('studio_landing_pages')
      .select('settings')
      .eq('id', landingPageId)
      .single()
    const lpSettings = (lp?.settings as Record<string, unknown> | null) ?? null
    if (lpSettings?.currency) resolvedCurrency = lpSettings.currency as string
    if (lpSettings?.language) resolvedLanguage = lpSettings.language as string
  }

  if (referrerCustomerId && referrerMarket) {
    if (referrerMarket.currency) resolvedCurrency = referrerMarket.currency
    if (referrerMarket.language) resolvedLanguage = referrerMarket.language
    if (referrerMarket.landing_page_id) resolvedLandingPageId = referrerMarket.landing_page_id
  }

  // Generate unique referral code for the new customer
  const newReferralCode = generateReferralCode()

  // Create customer
  const { data: customer, error: custError } = await adminSupabase
    .from('customers')
    .insert({
      studio_id: studioId,
      name,
      email: email || null,
      phone: phone || null,
      cashback_rate: cashbackRate,
      loyalty_stage: loyaltyStage,
      referral_code: newReferralCode,
      // Normalize to a valid ISO 4217 uppercase code — studio settings can hold
      // it lowercase (e.g. "eur"), which Google Wallet rejects on pass save.
      currency: resolvedCurrency.toUpperCase(),
      language: resolvedLanguage,
      landing_page_id: resolvedLandingPageId,
    })
    .select('id')
    .single()

  if (custError || !customer) {
    throw new Error(custError?.message ?? 'Failed to create customer')
  }

  // If referred, create referral row and welcome bonus
  if (referrerCustomerId && config.referrals.enabled) {
    await adminSupabase.from('referrals').insert({
      studio_id: studioId,
      referrer_customer_id: referrerCustomerId,
      referred_customer_id: customer.id,
      referral_code: referralCode!.toUpperCase(),
      status: 'pending',
    })

    if (config.referrals.friend_welcome_bonus > 0) {
      await adminSupabase.from('transactions').insert({
        customer_id: customer.id,
        studio_id: studioId,
        type: 'adjustment',
        amount: config.referrals.friend_welcome_bonus,
        description: 'Welcome bonus from referral',
      })

      await adminSupabase
        .from('customers')
        .update({ balance: config.referrals.friend_welcome_bonus })
        .eq('id', customer.id)
    }
  }

  // Fire webhook
  fireWebhook(studioId, 'member.created', customer.id, {
    name,
    email: email || null,
    phone: phone || null,
    tier: loyaltyStage,
    cashback_rate: cashbackRate,
    referred_by: referrerCustomerId,
  })

  // Send welcome email (fire-and-forget)
  if (email) {
    sendCustomerWelcome(customer.id, studioId)
  }

  // Update signup count
  if (landingPageId) {
    const { data: lp } = await adminSupabase
      .from('studio_landing_pages')
      .select('signup_count')
      .eq('id', landingPageId)
      .single()

    if (lp) {
      await adminSupabase
        .from('studio_landing_pages')
        .update({ signup_count: (lp.signup_count ?? 0) + 1 })
        .eq('id', landingPageId)
    }
  }

  // Log analytics event
  await adminSupabase.from('analytics_events').insert({
    studio_id: studioId,
    event_type: 'landing_signup',
    customer_id: customer.id,
    metadata: {
      landing_page_id: landingPageId,
      referred_by: referrerCustomerId,
      custom_fields: customFields ?? null,
    },
  })

  // Generate pass
  let passUrl: string | null = null
  try {
    const passRes = await passServiceFetch('/api/passes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: customer.id,
        platform: platform || 'apple',
      }),
    })

    if (passRes.ok) {
      const passData = await passRes.json()
      if (platform === 'google' && passData.saveUrl) {
        const su = passData.saveUrl
        const saveEndpoint = su.startsWith('http') ? su : `${PASS_SERVICE_URL}${su}`
        if (saveEndpoint.includes('pay.google.com')) {
          passUrl = saveEndpoint
        } else {
          try {
            const saveRes = await fetch(saveEndpoint)
            if (saveRes.ok) {
              const saveData = await saveRes.json()
              passUrl = saveData.saveUrl ?? saveEndpoint
            } else {
              const body = await saveRes.text().catch(() => '')
              console.error('[pass] Google saveUrl fetch failed', saveRes.status, body)
              passUrl = saveEndpoint
            }
          } catch (err) {
            console.error('[pass] Google saveUrl fetch threw', err)
            passUrl = saveEndpoint
          }
        }
      } else {
        passUrl = `${APP_URL}/pass/${passData.serialNumber}`
      }
    } else {
      const body = await passRes.text().catch(() => '')
      console.error('[pass] generate failed', passRes.status, body, { customerId: customer.id, platform })
    }
  } catch (err) {
    console.error('[pass] generate threw', err, { customerId: customer.id, platform })
  }

  // Store pass data in customer metadata
  if (passUrl) {
    const { data: existing } = await adminSupabase
      .from('customers')
      .select('metadata')
      .eq('id', customer.id)
      .single()
    const existingMetadata = (existing?.metadata as Record<string, unknown>) ?? {}
    await adminSupabase
      .from('customers')
      .update({
        metadata: { ...existingMetadata, pass_url: passUrl, pass_platform: platform || 'apple' },
      })
      .eq('id', customer.id)
  }

  return {
    customerId: customer.id,
    passUrl,
    customerAccessToken: createCustomerAccessToken(customer.id, 30 * 60),
  }
}

export class DuplicateMemberError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicateMemberError'
  }
}

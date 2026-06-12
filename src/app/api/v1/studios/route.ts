import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'
import { generateUniqueSlug } from '@/lib/slug'
import { DEFAULT_CARD_FIELDS, DEFAULT_STATIC_TEXTS } from '@/types/database'
import {
  STREAMINK_REWARDS_CONFIG,
  STREAMINK_WELCOME_BONUS,
  STREAMINK_TIER_THEMES,
  STREAMINK_PROMOTIONS,
} from '@/lib/templates/streamink-template'
import { getDefaultLandingPageCopy } from '@/lib/landing-page-defaults'

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || auth.keyId !== 'master') {
      return apiError('Unauthorized — master API key required', 401)
    }

    const body = await request.json()
    const { name, email, phone, address, currency, language, streamink_workspace_id } = body

    if (!name?.trim()) {
      return apiError('name is required', 400)
    }

    const slug = await generateUniqueSlug(name)
    const studioCurrency = (currency || 'DKK').toUpperCase()
    const studioLanguage = language || 'en'
    const landingDefaults = getDefaultLandingPageCopy(name.trim(), studioLanguage)

    // Set welcome bonus based on currency
    const rewardsConfig = {
      ...STREAMINK_REWARDS_CONFIG,
      referrals: {
        ...STREAMINK_REWARDS_CONFIG.referrals,
        friend_welcome_bonus: STREAMINK_WELCOME_BONUS[studioCurrency] ?? STREAMINK_WELCOME_BONUS.EUR,
      },
    }

    // Create studio
    const { data: studio, error: studioError } = await adminSupabase
      .from('studios')
      .insert({
        name: name.trim(),
        slug,
        subscription_status: 'agency',
        is_agency: true,
        settings: {
          source: 'streamink',
          streamink_workspace_id: streamink_workspace_id || null,
          onboarding_completed: true,
          onboarding_step: 4,
          onboarding_version: 2,
          email: email || null,
          phone: phone || null,
          address: address || null,
          currency: studioCurrency,
          language: studioLanguage,
          rewards_config: rewardsConfig,
        },
      })
      .select()
      .single()

    if (studioError || !studio) {
      return apiError(studioError?.message ?? 'Failed to create studio', 500)
    }

    // Create pass template with StreamInk tier themes
    const { error: templateError } = await adminSupabase
      .from('pass_templates')
      .insert({
        studio_id: studio.id,
        name: 'Default',
        is_active: true,
        tier_themes: STREAMINK_TIER_THEMES,
        card_fields: DEFAULT_CARD_FIELDS,
        static_texts: DEFAULT_STATIC_TEXTS,
        barcode_format: 'PKBarcodeFormatQR',
      })

    if (templateError) {
      console.error('[v1/studios] pass template error:', templateError)
    }

    // Create default landing page
    const { error: landingError } = await adminSupabase
      .from('studio_landing_pages')
      .insert({
        studio_id: studio.id,
        slug,
        headline: landingDefaults.headline,
        description: landingDefaults.description,
        settings: {
          brandColor: '#7C3AED',
          backgroundColor: '#0A0A0A',
          textColor: '#FFFFFF',
          logoUrl: null,
          buttonText: landingDefaults.buttonText,
          showPhone: true,
          showEmail: true,
          successHeading: landingDefaults.successHeading,
          successMessage: landingDefaults.successMessage,
          currency: studioCurrency,
          language: studioLanguage,
          termsUrl: '',
        },
      })

    if (landingError) {
      console.error('[v1/studios] landing page error:', landingError)
    }

    // Auto-create StreamInk promotion templates
    const promoInserts = STREAMINK_PROMOTIONS.map((p) => ({
      studio_id: studio.id,
      ...p,
    }))

    const { error: promoError } = await adminSupabase
      .from('promotions')
      .insert(promoInserts)

    if (promoError) {
      console.error('[v1/studios] promotions error:', promoError)
    }

    return apiSuccess(studio, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}

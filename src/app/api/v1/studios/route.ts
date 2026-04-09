import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'
import { generateUniqueSlug } from '@/lib/slug'
import { DEFAULT_REWARDS_CONFIG, DEFAULT_TIER_THEMES, DEFAULT_CARD_FIELDS, DEFAULT_STATIC_TEXTS } from '@/types/database'

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
          currency: currency || 'DKK',
          language: language || 'en',
          rewards_config: DEFAULT_REWARDS_CONFIG,
        },
      })
      .select()
      .single()

    if (studioError || !studio) {
      return apiError(studioError?.message ?? 'Failed to create studio', 500)
    }

    // Create default pass template
    const { error: templateError } = await adminSupabase
      .from('pass_templates')
      .insert({
        studio_id: studio.id,
        name: 'Default',
        is_active: true,
        tier_themes: DEFAULT_TIER_THEMES,
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
        headline: `Welcome to ${name.trim()}`,
        description: 'Sign up and get your digital loyalty card instantly.',
        settings: {
          brandColor: '#7C3AED',
          backgroundColor: '#0A0A0A',
          textColor: '#FFFFFF',
          logoUrl: null,
          buttonText: 'Join & Get Your Pass',
          showPhone: true,
          showEmail: true,
          successHeading: "You're in!",
          successMessage: 'Welcome, {name}. Your loyalty card is ready.',
          termsUrl: '',
        },
      })

    if (landingError) {
      console.error('[v1/studios] landing page error:', landingError)
    }

    return apiSuccess(studio, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}

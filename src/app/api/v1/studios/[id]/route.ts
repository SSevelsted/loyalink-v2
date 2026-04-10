import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth) return apiError('Unauthorized', 401)
    if (auth.studioId !== null && auth.studioId !== id) return apiError('Forbidden', 403)

    const { data: studio, error } = await adminSupabase
      .from('studios')
      .select('id, name, slug, settings, rewards_config, subscription_status, created_at')
      .eq('id', id)
      .single()

    if (error || !studio) return apiError('Studio not found', 404)

    return apiSuccess(studio)
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth) return apiError('Unauthorized', 401)
    if (auth.studioId !== null && auth.studioId !== id) return apiError('Forbidden', 403)

    const body = await request.json()
    const { name, settings } = body

    // Fetch current studio
    const { data: current } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', id)
      .single()

    if (!current) return apiError('Studio not found', 404)

    const ALLOWED_SETTINGS_KEYS = new Set([
      'rewards_config',
      'currency',
      'language',
      'story_copy',
      'onboarding_completed',
      'logoUrl',
      'backgroundColor',
      'textColor',
      'brandColor',
      'buttonText',
      'showEmail',
      'showPhone',
      'customFields',
      'termsUrl',
      'benefits',
      'showTierProgression',
      'successHeading',
      'successMessage',
      'email',
      'phone',
      'address_street',
      'address_city',
      'address_postal_code',
      'address_country',
      'source',
    ])

    const updates: Record<string, unknown> = {}
    if (name) updates.name = name.trim()
    if (settings) {
      // Whitelist allowed settings keys to prevent mass assignment
      const filtered: Record<string, unknown> = {}
      for (const key of Object.keys(settings)) {
        if (ALLOWED_SETTINGS_KEYS.has(key)) {
          filtered[key] = settings[key]
        }
      }
      // Merge settings (don't replace)
      updates.settings = { ...(current.settings as Record<string, unknown>), ...filtered }
    }

    const { data: studio, error } = await adminSupabase
      .from('studios')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return apiError(error.message, 500)

    return apiSuccess(studio)
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth) return apiError('Unauthorized', 401)
    if (auth.studioId !== null && auth.studioId !== id) return apiError('Forbidden', 403)

    const { error } = await adminSupabase
      .from('studios')
      .update({
        subscription_status: 'cancelled',
      })
      .eq('id', id)

    if (error) return apiError(error.message, 500)

    return apiSuccess({ deleted: true })
  } catch {
    return apiError('Internal server error', 500)
  }
}

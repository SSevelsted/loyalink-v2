import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'
import type { RewardsConfig } from '@/types/database'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth) return apiError('Unauthorized', 401)
    if (auth.studioId !== null && auth.studioId !== id) return apiError('Forbidden', 403)

    const { data: studio } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', id)
      .single()

    if (!studio) return apiError('Studio not found', 404)

    const settings = studio.settings as Record<string, unknown>
    return apiSuccess(settings?.rewards_config ?? null)
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

    const config = (await request.json()) as RewardsConfig

    if (!config || !Array.isArray(config.tiers)) {
      return apiError('Invalid rewards config — tiers[] required', 400)
    }

    const { data: studio } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', id)
      .single()

    if (!studio) return apiError('Studio not found', 404)

    const currentSettings = studio.settings as Record<string, unknown>
    const { error } = await adminSupabase
      .from('studios')
      .update({ settings: { ...currentSettings, rewards_config: config } })
      .eq('id', id)

    if (error) return apiError(error.message, 500)

    return apiSuccess(config)
  } catch {
    return apiError('Internal server error', 500)
  }
}

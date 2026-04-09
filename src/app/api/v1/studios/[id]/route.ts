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
      .select('*')
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

    const updates: Record<string, unknown> = {}
    if (name) updates.name = name.trim()
    if (settings) {
      // Merge settings (don't replace)
      updates.settings = { ...(current.settings as Record<string, unknown>), ...settings }
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

import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string; webhookId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, webhookId } = await params
    const auth = await validateApiKey(request)
    if (!auth) return apiError('Unauthorized', 401)
    if (auth.studioId !== null && auth.studioId !== id) return apiError('Forbidden', 403)

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.url !== undefined) {
      const url = body.url?.trim()
      if (!url) return apiError('url cannot be empty', 400)
      try { new URL(url) } catch { return apiError('Invalid URL', 400) }
      if (!url.startsWith('https://')) return apiError('URL must use HTTPS', 400)
      updates.url = url
    }

    if (body.events !== undefined) updates.events = body.events
    if (body.active !== undefined) updates.active = body.active

    const { data, error } = await adminSupabase
      .from('studio_webhooks')
      .update(updates)
      .eq('id', webhookId)
      .eq('studio_id', id)
      .select('id, url, events, active, created_at, updated_at')
      .single()

    if (error) return apiError(error.message, 500)
    if (!data) return apiError('Webhook not found', 404)

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id, webhookId } = await params
    const auth = await validateApiKey(request)
    if (!auth) return apiError('Unauthorized', 401)
    if (auth.studioId !== null && auth.studioId !== id) return apiError('Forbidden', 403)

    const { error } = await adminSupabase
      .from('studio_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('studio_id', id)

    if (error) return apiError(error.message, 500)

    return apiSuccess({ deleted: true })
  } catch {
    return apiError('Internal server error', 500)
  }
}

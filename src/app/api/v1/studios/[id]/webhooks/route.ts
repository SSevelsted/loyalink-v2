import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
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

    const { data, error } = await adminSupabase
      .from('studio_webhooks')
      .select('id, url, events, active, created_at, updated_at')
      .eq('studio_id', id)
      .order('created_at', { ascending: false })

    if (error) return apiError(error.message, 500)

    return apiSuccess(data ?? [])
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth) return apiError('Unauthorized', 401)
    if (auth.studioId !== null && auth.studioId !== id) return apiError('Forbidden', 403)

    const body = await request.json()
    const url = body.url?.trim()
    const events = body.events ?? []

    if (!url) return apiError('url is required', 400)

    try {
      new URL(url)
    } catch {
      return apiError('Invalid URL', 400)
    }

    if (!url.startsWith('https://')) {
      return apiError('URL must use HTTPS', 400)
    }

    const secret = `whsec_${randomBytes(24).toString('hex')}`

    const { data, error } = await adminSupabase
      .from('studio_webhooks')
      .insert({
        studio_id: id,
        url,
        secret,
        events,
      })
      .select('id, url, events, active, created_at')
      .single()

    if (error) return apiError(error.message, 500)

    return apiSuccess({ ...data, secret }, 201)
  } catch {
    return apiError('Internal server error', 500)
  }
}

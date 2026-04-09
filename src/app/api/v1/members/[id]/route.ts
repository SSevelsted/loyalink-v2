import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { data: customer, error } = await adminSupabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('studio_id', auth.studioId)
      .single()

    if (error || !customer) return apiError('Member not found', 404)

    return apiSuccess(customer)
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const body = await request.json()
    const allowedFields = ['name', 'email', 'phone', 'tags', 'metadata']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return apiError('No valid fields to update', 400)
    }

    const { data, error } = await adminSupabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('studio_id', auth.studioId)
      .select()
      .single()

    if (error) return apiError(error.message, 500)
    if (!data) return apiError('Member not found', 404)

    return apiSuccess(data)
  } catch {
    return apiError('Internal server error', 500)
  }
}

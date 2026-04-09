import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiError, apiPaginated, apiSuccess } from '@/lib/api-response'
import { createMember, DuplicateMemberError } from '@/lib/services/member-service'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
    const offset = Number(searchParams.get('offset') || 0)
    const search = searchParams.get('search')
    const tier = searchParams.get('tier')
    const hasPurchased = searchParams.get('has_purchased')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    let query = adminSupabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('studio_id', auth.studioId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    if (tier) {
      query = query.eq('loyalty_stage', tier)
    }
    if (hasPurchased !== null && hasPurchased !== undefined) {
      query = query.eq('has_purchased', hasPurchased === 'true')
    }

    const sortColumn = ['created_at', 'balance', 'total_real_spend', 'name'].includes(sort) ? sort : 'created_at'
    query = query.order(sortColumn, { ascending: order === 'asc' })
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) return apiError(error.message, 500)

    return apiPaginated(data ?? [], count ?? 0, limit, offset)
  } catch {
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { name, email, phone, platform, referral_code, custom_fields } = body

    if (!name?.trim()) {
      return apiError('name is required', 400)
    }

    const result = await createMember({
      studioId: auth.studioId,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      platform: platform || 'apple',
      referralCode: referral_code || null,
      customFields: custom_fields || null,
    })

    return apiSuccess(result, 201)
  } catch (err) {
    if (err instanceof DuplicateMemberError) {
      return apiError(err.message, 409)
    }
    return apiError('Internal server error', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { verifyEmbedToken } from '@/lib/embed-access'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const studioId = searchParams.get('studioId')
  const token = searchParams.get('token')

  if (!studioId || !token) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const payload = verifyEmbedToken(token)
  if (!payload || payload.studioId !== studioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
  const offset = Number(searchParams.get('offset') || 0)
  const type = searchParams.get('type')

  let query = adminSupabase
    .from('transactions')
    .select('*, customers!inner(name)', { count: 'exact' })
    .eq('studio_id', studioId)

  if (type) query = query.eq('type', type)

  query = query.order('created_at', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0, limit, offset })
}

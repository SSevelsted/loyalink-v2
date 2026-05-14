import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { verifyEmbedToken } from '@/lib/embed-access'

function normalizeScanValue(value: string) {
  const trimmed = value.trim()
  const compact = trimmed.replace(/\s+/g, '')

  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/').filter(Boolean)
    return {
      raw: trimmed,
      compact,
      candidates: Array.from(new Set([trimmed, compact, ...parts].filter(Boolean))),
    }
  } catch {
    return {
      raw: trimmed,
      compact,
      candidates: Array.from(new Set([trimmed, compact].filter(Boolean))),
    }
  }
}

function authorize(studioId: string | null, token: string | null) {
  if (!studioId || !token) return false
  const payload = verifyEmbedToken(token)
  return !!payload && payload.studioId === studioId
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const studioId = searchParams.get('studioId')
  const token = searchParams.get('token')
  const value = searchParams.get('value')

  if (!studioId || !token || !value?.trim()) {
    return NextResponse.json({ error: 'studioId, token, and value are required' }, { status: 400 })
  }
  if (!authorize(studioId, token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const normalized = normalizeScanValue(value)
  const fields = ['member_id', 'phone'] as const
  let data = null
  let error = null

  for (const candidate of normalized.candidates) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)
    const candidateFields = isUuid ? (['id', ...fields] as const) : fields

    for (const field of candidateFields) {
      const result = await adminSupabase
        .from('customers')
        .select('id, name, email, phone, balance, loyalty_stage, cashback_rate, total_real_spend, has_purchased')
        .eq('studio_id', studioId)
        .eq(field, candidate)
        .limit(1)
        .maybeSingle()

      if (result.error) {
        error = result.error
        break
      }
      if (result.data) {
        data = result.data
        break
      }
    }

    if (data || error) break
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No customer found' }, { status: 404 })

  return NextResponse.json({ customer: data })
}

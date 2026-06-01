import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { AudienceFilter } from '@/types/database'
import { verifyStudioAccess } from '@/lib/studio-access'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyStudioMember(studioId: string) {
  const result = await verifyStudioAccess(studioId)
  if (!result.authorized) return { authorized: false as const, error: result.error }
  return { authorized: true as const }
}

export async function POST(request: NextRequest) {
  try {
    const { studioId, audienceType, audienceFilter } = await request.json()

    if (!studioId) return NextResponse.json({ error: 'studioId is required' }, { status: 400 })

    const auth = await verifyStudioMember(studioId)
    if (!auth.authorized) return auth.error

    const filter = (audienceFilter || {}) as AudienceFilter

    let query = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studioId)

    if (audienceType === 'customers' && filter.customer_ids?.length) {
      query = query.in('id', filter.customer_ids)
    } else if (audienceType === 'segment') {
      if (filter.loyalty_stages?.length) {
        query = query.in('loyalty_stage', filter.loyalty_stages)
      }
      if (filter.tags?.length) {
        query = query.overlaps('tags', filter.tags)
      }
      if (filter.min_balance != null) {
        query = query.gte('balance', filter.min_balance)
      }
      if (filter.min_spend != null) {
        query = query.gte('total_real_spend', filter.min_spend)
      }
      if (filter.has_purchased != null) {
        query = query.eq('has_purchased', filter.has_purchased)
      }
      if (filter.joined_after) {
        query = query.gte('created_at', filter.joined_after)
      }
      if (filter.joined_before) {
        query = query.lte('created_at', filter.joined_before)
      }
    }

    const { count, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

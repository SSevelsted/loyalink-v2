import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase, verifyStudioAccess } from '@/lib/studio-access'

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  const slugsParam = request.nextUrl.searchParams.get('slugs')

  if (!studioId || !slugsParam) {
    return NextResponse.json({ error: 'studioId and slugs are required' }, { status: 400 })
  }

  // Grants access to studio members AND super_admins (who manage any studio).
  const access = await verifyStudioAccess(studioId)
  if (!access.authorized) {
    return access.error
  }

  const slugs = slugsParam.split(',').filter(Boolean)

  // Count members per tier slug
  const { data: memberRows, error: memberError } = await adminSupabase
    .from('customers')
    .select('loyalty_stage')
    .eq('studio_id', studioId)
    .in('loyalty_stage', slugs)

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  const members: Record<string, number> = {}
  for (const slug of slugs) members[slug] = 0
  for (const row of memberRows ?? []) {
    members[row.loyalty_stage] = (members[row.loyalty_stage] ?? 0) + 1
  }

  // Count active promotions referencing these tier slugs
  const { data: promoRows, error: promoError } = await adminSupabase
    .from('member_promotions')
    .select('original_tier_slug')
    .eq('status', 'active')
    .in('original_tier_slug', slugs)

  if (promoError) {
    return NextResponse.json({ error: promoError.message }, { status: 500 })
  }

  const promotions: Record<string, number> = {}
  for (const slug of slugs) promotions[slug] = 0
  for (const row of promoRows ?? []) {
    promotions[row.original_tier_slug] = (promotions[row.original_tier_slug] ?? 0) + 1
  }

  return NextResponse.json({ members, promotions })
}

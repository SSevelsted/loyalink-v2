import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken } from '@/lib/customer-access'
import { loadMemberPage } from '@/lib/services/member-page-service'

// The member page data as JSON. Like the page, it holds personal data, so it
// needs the member's customer access token (Authorization: Bearer <token>).
// Before, this route answered anyone who knew the member id.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params
  const page = await loadMemberPage(memberId, getBearerToken(request.headers.get('authorization')))

  if (!page) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }
  if (page.access !== 'full') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    customer: page.customer,
    studio: page.studio,
    branding: page.branding,
    logoUrl: page.logoUrl,
    rewardsConfig: page.rewardsConfig,
    referrals: page.referrals,
  })
}

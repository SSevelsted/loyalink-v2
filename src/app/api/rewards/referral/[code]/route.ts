import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { referralLimiter, getIP } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { success } = referralLimiter.check(20, getIP(_request))
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { code } = await params

  if (!code) {
    return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('name, studio_id, studios:studio_id(name)')
    .eq('referral_code', code.toUpperCase())
    .single()

  if (error || !customer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  const studioData = customer.studios as unknown as { name: string } | null

  return NextResponse.json({
    valid: true,
    referrerName: customer.name,
    studioId: customer.studio_id,
    studioName: studioData?.name ?? null,
  })
}

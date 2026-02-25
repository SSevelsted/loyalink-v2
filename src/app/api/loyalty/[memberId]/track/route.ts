import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params

  const { event } = await request.json()
  if (!event || typeof event !== 'string') {
    return NextResponse.json({ error: 'event is required' }, { status: 400 })
  }

  // Look up customer by member_id (nanoid) or id
  let customer
  const { data: byMemberId } = await supabase
    .from('customers')
    .select('id, metadata')
    .eq('member_id', memberId)
    .single()

  if (byMemberId) {
    customer = byMemberId
  } else {
    const { data: byId } = await supabase
      .from('customers')
      .select('id, metadata')
      .eq('id', memberId)
      .single()
    customer = byId
  }

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const existingMetadata = (customer.metadata as Record<string, unknown>) ?? {}
  await supabase
    .from('customers')
    .update({
      metadata: { ...existingMetadata, [event]: new Date().toISOString() },
    })
    .eq('id', customer.id)

  return NextResponse.json({ ok: true })
}

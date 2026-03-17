import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBearerToken, verifyCustomerAccessToken } from '@/lib/customer-access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params
  const access = verifyCustomerAccessToken(getBearerToken(request.headers.get('authorization')))

  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up customer by member_id (nanoid) or id
  let customer
  const { data: byMemberId } = await supabase
    .from('customers')
    .select('id, studio_id, metadata')
    .eq('member_id', memberId)
    .single()

  if (byMemberId) {
    customer = byMemberId
  } else {
    const { data: byId } = await supabase
      .from('customers')
      .select('id, studio_id, metadata')
      .eq('id', memberId)
      .single()
    customer = byId
  }

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  if (customer.id !== access.customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('avatar') as File | null

  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 })
  }

  if (file.size > 1 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 1MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const path = `studio-assets/${customer.studio_id}/customer-avatars/${customer.id}.webp`

  const { error: uploadError } = await supabase.storage
    .from('studio-assets')
    .upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('studio-assets')
    .getPublicUrl(path)

  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const existingMetadata = (customer.metadata as Record<string, unknown>) ?? {}
  await supabase
    .from('customers')
    .update({ metadata: { ...existingMetadata, avatar_url: avatarUrl } })
    .eq('id', customer.id)

  return NextResponse.json({ avatar_url: avatarUrl })
}

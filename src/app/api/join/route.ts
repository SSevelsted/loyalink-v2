import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export async function POST(request: NextRequest) {
  try {
    const { studioId, landingPageId, name, email, phone } = await request.json()

    if (!studioId || !name) {
      return NextResponse.json({ error: 'studioId and name are required' }, { status: 400 })
    }

    // Create customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .insert({
        studio_id: studioId,
        name,
        email: email || null,
        phone: phone || null,
      })
      .select('id')
      .single()

    if (custError) {
      return NextResponse.json({ error: custError.message }, { status: 500 })
    }

    // Update signup count
    if (landingPageId) {
      const { data: lp } = await supabase
        .from('studio_landing_pages')
        .select('signup_count')
        .eq('id', landingPageId)
        .single()

      if (lp) {
        await supabase
          .from('studio_landing_pages')
          .update({ signup_count: (lp.signup_count ?? 0) + 1 })
          .eq('id', landingPageId)
      }
    }

    // Log analytics event
    await supabase.from('analytics_events').insert({
      studio_id: studioId,
      event_type: 'landing_signup',
      customer_id: customer.id,
      metadata: { landing_page_id: landingPageId },
    })

    // Generate pass
    let passUrl: string | null = null
    try {
      const passRes = await fetch(`${PASS_SERVICE_URL}/api/passes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          studioId,
        }),
      })

      if (passRes.ok) {
        const passData = await passRes.json()
        passUrl = passData.downloadUrl ?? `${PASS_SERVICE_URL}/api/passes/${passData.serialNumber}/download`
      }
    } catch {
      // Pass generation failed — non-critical
    }

    return NextResponse.json({
      customerId: customer.id,
      passUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

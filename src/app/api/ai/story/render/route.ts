import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const userClient = await createClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { html } = await request.json()
  if (!html) {
    return NextResponse.json({ error: 'html is required' }, { status: 400 })
  }

  const userId = process.env.HCTI_USER_ID
  const apiKey = process.env.HCTI_API_KEY

  if (!userId || !apiKey) {
    return NextResponse.json({ error: 'HCTI_NOT_CONFIGURED' }, { status: 503 })
  }

  const credentials = Buffer.from(`${userId}:${apiKey}`).toString('base64')

  const res = await fetch('https://hcti.io/v1/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      html,
      viewport_width: 1080,
      viewport_height: 1920,
      device_scale_factor: 1,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[render] HCTI error:', res.status, body)
    return NextResponse.json({ error: 'Failed to render image' }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ imageUrl: data.url })
}

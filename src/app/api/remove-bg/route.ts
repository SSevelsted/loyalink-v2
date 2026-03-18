import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const poofForm = new FormData()
  poofForm.append('image_file', image)

  let poofRes: Response
  try {
    poofRes = await fetch('https://api.poof.bg/v1/remove', {
      method: 'POST',
      headers: { 'x-api-key': process.env.POOF_API_KEY! },
      body: poofForm,
    })
  } catch (err) {
    console.error('[remove-bg] fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach Poof API' }, { status: 500 })
  }

  if (!poofRes.ok) {
    const message = await poofRes.text().catch(() => 'Unknown error')
    console.error('[remove-bg] Poof error:', poofRes.status, message)
    return NextResponse.json({ error: `Background removal failed: ${message}` }, { status: 500 })
  }

  const resultBuffer = await poofRes.arrayBuffer()
  return new NextResponse(resultBuffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  })
}

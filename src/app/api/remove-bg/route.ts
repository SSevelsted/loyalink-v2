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

  const removeBgForm = new FormData()
  removeBgForm.append('image_file', image)
  removeBgForm.append('size', 'auto')

  let removeBgRes: Response
  try {
    removeBgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY! },
      body: removeBgForm,
    })
  } catch (err) {
    console.error('[remove-bg] fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach remove.bg API' }, { status: 500 })
  }

  if (!removeBgRes.ok) {
    const message = await removeBgRes.text().catch(() => 'Unknown error')
    console.error('[remove-bg] remove.bg error:', removeBgRes.status, message)
    return NextResponse.json({ error: `Background removal failed: ${message}` }, { status: 500 })
  }

  const resultBuffer = await removeBgRes.arrayBuffer()
  return new NextResponse(resultBuffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { verifyEmbedToken } from '@/lib/embed-access'

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  const token = request.nextUrl.searchParams.get('token')

  if (!studioId || !token) {
    return NextResponse.json({ error: 'Missing studioId or token' }, { status: 400 })
  }

  const payload = verifyEmbedToken(token)
  if (!payload || payload.studioId !== studioId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const { data: studio, error } = await adminSupabase
    .from('studios')
    .select('*')
    .eq('id', studioId)
    .single()

  if (error || !studio) {
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
  }

  return NextResponse.json({ studio })
}

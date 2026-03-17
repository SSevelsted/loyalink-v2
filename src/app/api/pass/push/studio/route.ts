import { NextRequest, NextResponse } from 'next/server'
import { passServiceFetch } from '@/lib/pass-service'
import { getSessionUser, isStudioMember } from '@/lib/studio-access'

export async function POST(request: NextRequest) {
  try {
    const {
      studioId,
      segmentFilter,
      campaignId,
      automationId,
      pushMessage,
    } = await request.json() as {
      studioId?: string
      segmentFilter?: Record<string, unknown>
      campaignId?: string
      automationId?: string
      pushMessage?: string
    }

    if (!studioId) {
      return NextResponse.json({ error: 'studioId is required' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const member = await isStudioMember(user.id, studioId)
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const res = await passServiceFetch(`/api/push/studio/${studioId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segmentFilter, campaignId, automationId, pushMessage }),
    })

    const data = await res.json().catch(() => ({ error: 'Failed to send push' }))

    if (!res.ok) {
      return NextResponse.json(
        { error: typeof data?.error === 'string' ? data.error : 'Failed to send push' },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

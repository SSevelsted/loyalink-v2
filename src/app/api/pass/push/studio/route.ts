import { NextRequest, NextResponse } from 'next/server'
import { passServiceFetch } from '@/lib/pass-service'
import { verifyStudioAccess } from '@/lib/studio-access'

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

    // Grants access to studio members AND super_admins (who manage any studio).
    const access = await verifyStudioAccess(studioId)
    if (!access.authorized) {
      return access.error
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

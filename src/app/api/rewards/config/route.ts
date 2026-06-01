import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { DEFAULT_REWARDS_CONFIG, migrateRewardsConfig } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import { verifyStudioAccess } from '@/lib/studio-access'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyStudioMember(studioId: string): Promise<{ authorized: boolean; error?: NextResponse }> {
  const result = await verifyStudioAccess(studioId)
  if (!result.authorized) return { authorized: false, error: result.error }
  return { authorized: true }
}

export async function GET(request: NextRequest) {
  const studioId = request.nextUrl.searchParams.get('studioId')
  if (!studioId) {
    return NextResponse.json({ error: 'studioId is required' }, { status: 400 })
  }

  const auth = await verifyStudioMember(studioId)
  if (!auth.authorized) return auth.error!

  const { data: studio, error } = await supabase
    .from('studios')
    .select('settings')
    .eq('id', studioId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const settings = studio.settings as Record<string, unknown> | null
  const config = settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : DEFAULT_REWARDS_CONFIG

  return NextResponse.json(config)
}

export async function PUT(request: NextRequest) {
  try {
    const { studioId, config } = await request.json() as { studioId: string; config: RewardsConfig }

    if (!studioId || !config) {
      return NextResponse.json({ error: 'studioId and config are required' }, { status: 400 })
    }

    const auth = await verifyStudioMember(studioId)
    if (!auth.authorized) return auth.error!

    // Fetch current settings to merge
    const { data: studio, error: fetchError } = await supabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const currentSettings = (studio.settings as Record<string, unknown>) ?? {}

    const { error } = await supabase
      .from('studios')
      .update({
        settings: { ...currentSettings, rewards_config: config },
      })
      .eq('id', studioId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

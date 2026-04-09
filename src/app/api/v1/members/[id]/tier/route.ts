import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { apiSuccess, apiError } from '@/lib/api-response'
import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG } from '@/types/database'
import type { RewardsConfig } from '@/types/database'
import { passServiceFetch } from '@/lib/pass-service'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await validateApiKey(request)
    if (!auth || !auth.studioId) return apiError('Unauthorized', 401)

    const { tier_slug, cashback_rate } = await request.json()

    if (!tier_slug) {
      return apiError('tier_slug is required', 400)
    }

    // Fetch customer
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('id, loyalty_stage, studio_id')
      .eq('id', id)
      .eq('studio_id', auth.studioId)
      .single()

    if (!customer) return apiError('Member not found', 404)

    // Fetch rewards config to validate tier
    const { data: studio } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', auth.studioId)
      .single()

    const settings = studio?.settings as Record<string, unknown> | null
    const config: RewardsConfig = settings?.rewards_config
      ? migrateRewardsConfig(settings.rewards_config)
      : DEFAULT_REWARDS_CONFIG

    const tier = config.tiers.find(t => t.slug === tier_slug)
    if (!tier) {
      return apiError(`Tier "${tier_slug}" not found in rewards config`, 400)
    }

    const previousTier = customer.loyalty_stage
    const newCashbackRate = cashback_rate ?? tier.cashback_rate

    await adminSupabase
      .from('customers')
      .update({ loyalty_stage: tier_slug, cashback_rate: newCashbackRate })
      .eq('id', id)

    // Log analytics event
    await adminSupabase.from('analytics_events').insert({
      studio_id: auth.studioId,
      event_type: 'tier_change',
      customer_id: id,
      metadata: {
        from_tier: previousTier,
        to_tier: tier_slug,
        to_tier_name: tier.name,
        cashback_rate: newCashbackRate,
        source: 'api',
      },
    })

    // Trigger pass update
    void passServiceFetch(`/api/push/customer/${id}`, { method: 'POST' }).catch(() => {})

    return apiSuccess({ tier_slug, cashback_rate: newCashbackRate })
  } catch {
    return apiError('Internal server error', 500)
  }
}

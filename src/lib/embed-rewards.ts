import { migrateRewardsConfig, DEFAULT_REWARDS_CONFIG, type RewardsConfig } from '@/types/database'

/**
 * Resolve a studio's rewards config for embed pages, which have the studio (with
 * settings) in context but not the session-bound useRewardsConfig() query.
 *
 * Used so tier labels resolve the same way as the full app — e.g. a legacy
 * customer whose loyalty_stage holds a non-tier value like `card_pending` falls
 * back to the base tier name instead of rendering the raw slug.
 */
export function rewardsConfigFromStudio(
  studio: { settings?: unknown } | null | undefined
): RewardsConfig {
  const settings = (studio?.settings ?? {}) as Record<string, unknown>
  return settings.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : DEFAULT_REWARDS_CONFIG
}

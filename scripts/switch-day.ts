/**
 * Switch day: move ONE studio to the StreamInk pilot rewards.
 *
 * Dry run by default: reads only and prints the current rewards_config, the
 * target, the diff and the impact on members, promotions and referrals.
 *
 *   node --env-file=.env.local --import tsx scripts/switch-day.ts --studio=<loyalink studio uuid>
 *   ... --welcome-bonus=25 --currency=EUR   (defaults: EUR 25, SEK 250; other currencies need --welcome-bonus)
 *
 * --referral-only (current studios): only the gift/referral rules below
 * change (welcome bonus, no giver bonus, no commission, first full payment),
 * and the giver tier (tiers[2]) becomes Inner Circle: 15% at 3 activated
 * referrals. The other tier rates, the friend tier and every member's deal
 * stay as they are.
 *
 * Target (src/lib/services/pilot-switch-service.ts, full mode, new studios):
 *   - tiers 5% base, 10% after the tattoo (first full payment), 15% Inner
 *     Circle at 3 activated referrals (3 friends who paid at the counter;
 *     Loyalink upgrades the giver at the 3rd friend's payment);
 *     the slugs of today's first 3 tiers are reused
 *   - friend joins on the 10% tier and gets the welcome bonus from Loyalink
 *   - giver: no Loyalink cashback bonus, no commission; referral activates on
 *     the friend's first full payment
 *   - existing members keep their tier and rate, promotion fallbacks included
 *
 * --apply writes, and refuses when the dry run shows a blocker:
 *   - rows with no rate are pinned to today's rate (no event, no pass push)
 *   - studios.settings.rewards_config = target, with pilot_switched_at and
 *     pilot_switch_mode ('full' | 'referral_only'); StreamInk reads both from
 *     GET /api/v1/studios/:id/rewards-config
 *   - studios.settings.pilot_switch = { switched_at, tier_slugs, rates,
 *     friend_welcome_bonus, currency, previous_rewards_config }
 * No webhook, email, message or wallet-pass push is sent.
 *
 *   node --env-file=.env.local --import tsx scripts/switch-day.ts --studio=<uuid> --apply
 *
 * --update-inner-circle (studios ALREADY switched, either mode): rewrites only
 * tiers[2] to 15% at 3 activated referrals (giver bonus and commission stay
 * 0), and raises members already on that tier to 15% (promotion-aware: an
 * active promotion stays the main deal, its fallback takes the 15%). Members
 * below it whose referral_count already reaches 3 are listed, not moved.
 * Dry run by default; re-runnable. No webhook, email, message or pass push.
 *
 *   node --env-file=.env.local --import tsx scripts/switch-day.ts --studio=<uuid> --update-inner-circle
 *   node --env-file=.env.local --import tsx scripts/switch-day.ts --studio=<uuid> --update-inner-circle --apply
 */
import {
  applyInnerCircleUpdate,
  applyPilotSwitch,
  describeInnerCircleUpdatePlan,
  describePilotSwitchPlan,
  loadPilotSwitchInput,
  planInnerCircleUpdate,
  planPilotSwitch,
} from '../src/lib/services/pilot-switch-service'

function flag(name: string): string | undefined {
  const args = process.argv.slice(2)
  const eq = args.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.slice(name.length + 3)
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined
}

async function main() {
  const studioId = flag('studio')
  const apply = process.argv.includes('--apply')
  const bonusRaw = flag('welcome-bonus')
  const currency = flag('currency')
  const mode = process.argv.includes('--referral-only') ? 'referral_only' as const : 'full' as const
  const updateInnerCircle = process.argv.includes('--update-inner-circle')

  if (!studioId) {
    console.error('Usage: scripts/switch-day.ts --studio=<loyalink studio uuid> [--welcome-bonus=25] [--currency=EUR] [--referral-only] [--apply]')
    console.error('       scripts/switch-day.ts --studio=<loyalink studio uuid> --update-inner-circle [--apply]')
    process.exit(2)
  }
  if (updateInnerCircle && (bonusRaw != null || currency != null || process.argv.includes('--referral-only'))) {
    console.error('--update-inner-circle takes only --studio and --apply')
    process.exit(2)
  }
  const welcomeBonus = bonusRaw == null ? undefined : Number(bonusRaw)
  if (welcomeBonus != null && (!Number.isFinite(welcomeBonus) || welcomeBonus < 0)) {
    console.error(`--welcome-bonus must be a non-negative number, got "${bonusRaw}"`)
    process.exit(2)
  }

  const input = await loadPilotSwitchInput(studioId)
  if (!input) {
    console.log(`Studio ${studioId} not found in Loyalink. Nothing to switch.`)
    process.exit(1)
  }

  if (updateInnerCircle) {
    const update = planInnerCircleUpdate(input)
    for (const line of describeInnerCircleUpdatePlan(update)) console.log(line)
    if (!apply) {
      console.log('')
      console.log('Dry run. Nothing written. Pass --apply to update.')
      return
    }
    if (update.blockers.length > 0) {
      console.error('Not applied: resolve the blockers first.')
      process.exit(1)
    }
    const result = await applyInnerCircleUpdate(update)
    console.log('')
    console.log(`Config ${result.configSaved ? 'saved' : 'already up to date'}. Raised ${result.membersRaised} members (${result.promotionsUpdated} promotion fallbacks).`)
    return
  }

  const plan = planPilotSwitch(input, { welcomeBonus, currency, mode })
  for (const line of describePilotSwitchPlan(plan)) console.log(line)

  if (!apply) {
    console.log('')
    console.log('Dry run. Nothing written. Pass --apply to switch.')
    return
  }
  if (plan.blockers.length > 0) {
    console.error('Not applied: resolve the blockers first.')
    process.exit(1)
  }

  const result = await applyPilotSwitch(plan)
  console.log('')
  console.log(`Switched at ${result.record.switched_at}. Pinned ${result.pinned} members.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

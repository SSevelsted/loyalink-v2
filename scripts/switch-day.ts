/**
 * Switch day: move ONE studio to the StreamInk pilot rewards.
 *
 * Dry run by default: reads only and prints the current rewards_config, the
 * target, the diff and the impact on members, promotions and referrals.
 *
 *   node --env-file=.env.local --import tsx scripts/switch-day.ts --studio=<loyalink studio uuid>
 *   ... --welcome-bonus=25 --currency=EUR   (defaults: EUR 25, SEK 250; other currencies need --welcome-bonus)
 *
 * Target (src/lib/services/pilot-switch-service.ts):
 *   - tiers 5% base, 10% after the tattoo (first full payment), 15% giver (1 referral);
 *     the slugs of today's first 3 tiers are reused
 *   - friend joins on the 10% tier and gets the welcome bonus from Loyalink
 *   - giver: no Loyalink cashback bonus, no commission; referral activates on
 *     the friend's first full payment
 *   - existing members keep their tier and rate, promotion fallbacks included
 *
 * --apply writes, and refuses when the dry run shows a blocker:
 *   - rows with no rate are pinned to today's rate (no event, no pass push)
 *   - studios.settings.rewards_config = target, with pilot_switched_at
 *   - studios.settings.pilot_switch = { switched_at, tier_slugs, rates,
 *     friend_welcome_bonus, currency, previous_rewards_config }
 * No webhook, email, message or wallet-pass push is sent.
 *
 *   node --env-file=.env.local --import tsx scripts/switch-day.ts --studio=<uuid> --apply
 */
import {
  applyPilotSwitch,
  describePilotSwitchPlan,
  loadPilotSwitchInput,
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

  if (!studioId) {
    console.error('Usage: scripts/switch-day.ts --studio=<loyalink studio uuid> [--welcome-bonus=25] [--currency=EUR] [--apply]')
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

  const plan = planPilotSwitch(input, { welcomeBonus, currency })
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

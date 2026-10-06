/**
 * Move 'full' switched studios' referral activation to the deposit.
 *
 * Owner decision 2026-10-06: the giver's reward and the Inner Circle count
 * happen when the friend pays the deposit (activation_trigger first_purchase:
 * any transaction, the deposit included). A later refund or cancel claws
 * nothing back. Studios switched in 'full' mode before that run
 * first_full_payment.
 *
 * Dry run by default: reads only, and lists every switched studio with its
 * mode and current activation trigger.
 *
 *   node --env-file=.env.local --import tsx scripts/activation-trigger-to-deposit.ts
 *
 * --apply sets referrals.activation_trigger = { type: 'first_purchase' } on
 * the 'full' studios that are not on it yet. Nothing else changes. Studios
 * in 'referral_only' mode (Ink Nation) are never touched. No webhook, email,
 * message or pass push. Pending referrals whose friend already paid a deposit
 * activate at the friend's next transaction, not now.
 *
 *   node --env-file=.env.local --import tsx scripts/activation-trigger-to-deposit.ts --apply
 */
import { applyDepositTrigger, loadDepositTriggerPlan } from '../src/lib/services/pilot-switch-service'

async function main() {
  const apply = process.argv.includes('--apply')
  const rows = await loadDepositTriggerPlan()

  if (rows.length === 0) {
    console.log('No switched studios.')
    return
  }
  for (const r of rows) {
    const what = r.action === 'set'
      ? `${r.trigger_before} -> first_purchase`
      : r.action === 'already' ? 'already first_purchase' : `kept (${r.trigger_before}, referral_only)`
    console.log(`${r.studio_name} (${r.studio_id})  mode=${r.mode}  ${what}`)
  }
  const toSet = rows.filter((r) => r.action === 'set')
  console.log('')
  console.log(`${toSet.length} to update, ${rows.filter((r) => r.action === 'already').length} already on the deposit, ${rows.filter((r) => r.action === 'skip_referral_only').length} referral_only kept.`)

  if (!apply) {
    console.log('Dry run. Nothing written. Pass --apply to update.')
    return
  }
  const updated = await applyDepositTrigger(rows)
  console.log(`Updated ${updated.length} studios: ${updated.join(', ') || '(none)'}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

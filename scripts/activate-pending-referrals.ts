/**
 * One-off backfill: activate referrals the activation bug left pending
 * (fixed in the same PR as this script).
 *
 * Dry run by default: reads only and prints, per pending referral, whether
 * the friend's purchases so far would have activated it and what the
 * referrer would get.
 *
 *   node --env-file=.env.local --import tsx scripts/activate-pending-referrals.ts
 *   node --env-file=.env.local --import tsx scripts/activate-pending-referrals.ts --studio <studio uuid>
 *
 * --apply activates the rows marked "qualifies", through the same path as a
 * purchase. Per activated referral:
 *   - referrals row: status 'activated', activated_at now, commission window
 *     opens now (no commission for past purchases)
 *   - referrer: referral_count + 1, cashback rate + the per-referral bonus up
 *     to the cap (into the promotion's fallback while one runs)
 *   - a referral.activated webhook to the studio's webhooks (StreamInk)
 *   - the referral reward email to the referrer (skipped for agency studios
 *     and without RESEND_API_KEY)
 *   - a wallet-pass push for the referrer
 *
 *   node --env-file=.env.local --import tsx scripts/activate-pending-referrals.ts --apply
 */
import {
  applyPendingReferralActivations,
  planPendingReferralActivations,
} from '../src/lib/services/referral-service'

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const apply = process.argv.includes('--apply')
  const studioId = argValue('--studio')

  const plans = await planPendingReferralActivations({ studioId })
  console.table(plans.map((p) => ({
    referral: p.referral_id.slice(0, 8),
    studio: p.studio_name,
    created: p.created_at.slice(0, 10),
    trigger: p.trigger,
    friend: p.friend.name,
    purchased: p.friend.has_purchased,
    spend: p.friend.total_real_spend,
    verdict: p.verdict,
    referrer: p.referrer?.name ?? '-',
    'rate now': p.referrer?.permanent_rate ?? '-',
    'rate after': p.referrer?.new_permanent_rate ?? '-',
    'earns after': p.referrer?.effective_rate_after ?? '-',
    promotion: p.referrer?.promotion ?? '-',
  })))

  const qualifying = plans.filter((p) => p.verdict === 'qualifies')
  console.log(`${plans.length} pending, ${qualifying.length} qualify.`)
  if (!apply) {
    console.log('Dry run. Nothing written. Pass --apply to activate the qualifying referrals.')
    return
  }

  const applied = await applyPendingReferralActivations(plans)
  for (const a of applied) {
    console.log(`${a.referral_id}: ${a.activated ? 'activated' : 'NOT activated'}${a.results.length ? ` (${a.results.join('; ')})` : ''}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

/**
 * One-off script: creates a Loyalink test-pilot coupon + N unique promotion codes.
 *
 * Run with:
 *   node --env-file=.env.local scripts/create-test-pilot-codes.mjs [count] [existingCouponId]
 *
 *   # fresh coupon + 10 codes
 *   node --env-file=.env.local scripts/create-test-pilot-codes.mjs 10
 *
 *   # reuse an existing coupon, add 3 more codes
 *   node --env-file=.env.local scripts/create-test-pilot-codes.mjs 3 eBgVWFjt
 *
 * Each code:
 *   - 100% off for 12 months (repeating)
 *   - Single-use (max_redemptions: 1) — once redeemed the code is dead,
 *     so it can't be shared around
 *   - Limited to first-time Stripe customers on this account
 *   - Random, unguessable 10-char string
 *
 * Prints the codes — distribute one per test pilot.
 */

import Stripe from 'stripe'
import { randomBytes } from 'node:crypto'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })

const COUNT = Math.max(1, parseInt(process.argv[2] ?? '10', 10) || 10)
const EXISTING_COUPON_ID = process.argv[3] ?? null
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I for readability
const CODE_LEN = 10

function randomCode() {
  const bytes = randomBytes(CODE_LEN)
  let out = ''
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

async function run() {
  console.log(`Creating ${COUNT} test-pilot promo code${COUNT === 1 ? '' : 's'}...\n`)

  // 1. Coupon — reuse if an id was passed, otherwise create a fresh 100% off / 12 months one.
  let coupon
  if (EXISTING_COUPON_ID) {
    coupon = await stripe.coupons.retrieve(EXISTING_COUPON_ID)
    console.log(`✓ Reusing coupon:  ${coupon.id}  (${coupon.percent_off}% off, ${coupon.duration}${coupon.duration_in_months ? ` ${coupon.duration_in_months}m` : ''})\n`)
  } else {
    coupon = await stripe.coupons.create({
      name: 'Test Pilot — 12 months free',
      percent_off: 100,
      duration: 'repeating',
      duration_in_months: 12,
      metadata: { program: 'loyalink_test_pilot' },
    })
    console.log(`✓ Created coupon:  ${coupon.id}  (100% off for 12 months)\n`)
  }

  // 2. N promotion codes — each single-use, random string.
  for (let i = 0; i < COUNT; i++) {
    const code = randomCode()
    const promo = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
      max_redemptions: 1,
      restrictions: { first_time_transaction: true },
      metadata: { program: 'loyalink_test_pilot' },
    })
    console.log(`  ${String(i + 1).padStart(2, ' ')}. ${promo.code}`)
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('Distribute one code per test pilot. Each is single-use.')
  console.log('View/manage: https://dashboard.stripe.com/coupons/' + coupon.id)
  console.log('─────────────────────────────────────────────')
}

run().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})

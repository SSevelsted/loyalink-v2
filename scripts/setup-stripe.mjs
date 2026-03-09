/**
 * One-off script: creates Loyalink products + prices in Stripe.
 * Run with: node --env-file=.env.local scripts/setup-stripe.mjs
 *
 * Creates:
 *   - Loyalink Basic  → flat €49/month
 *   - Loyalink Pro    → flat €79/month
 *   - Member Usage    → graduated tiered recurring (€0.79 / €0.59 / €0.39 / €0.29)
 *
 * Prints the price IDs to add to .env.local.
 */

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })

async function run() {
  console.log('Creating Stripe products and prices...\n')

  // 1. Loyalink Basic — €49/month flat
  const basic = await stripe.products.create({
    name: 'Loyalink Basic',
    description: '1 location · Wallet passes · Stamp card · Cashback · Referrals',
  })
  const basicPrice = await stripe.prices.create({
    product: basic.id,
    currency: 'eur',
    unit_amount: 4900, // €49.00
    recurring: { interval: 'month' },
    nickname: 'Basic monthly',
  })
  console.log(`✓ Basic product:  ${basic.id}`)
  console.log(`✓ Basic price:    ${basicPrice.id}  (€49/month)\n`)

  // 2. Loyalink Pro — €79/month flat
  const pro = await stripe.products.create({
    name: 'Loyalink Pro',
    description: '5 locations · Multi-tier loyalty · Automations · Segmentation · 5 team logins',
  })
  const proPrice = await stripe.prices.create({
    product: pro.id,
    currency: 'eur',
    unit_amount: 7900, // €79.00
    recurring: { interval: 'month' },
    nickname: 'Pro monthly',
  })
  console.log(`✓ Pro product:    ${pro.id}`)
  console.log(`✓ Pro price:      ${proPrice.id}  (€79/month)\n`)

  // 3. Member Usage — graduated tiered per installed pass
  const member = await stripe.products.create({
    name: 'Loyalink Member Usage',
    description: 'Per active member (installed wallet pass) — graduated tiers',
  })
  const memberPrice = await stripe.prices.create({
    product: member.id,
    currency: 'eur',
    billing_scheme: 'tiered',
    tiers_mode: 'graduated',
    recurring: { interval: 'month', usage_type: 'licensed' },
    tiers: [
      { up_to: 100,        unit_amount: 79  }, // €0.79
      { up_to: 500,        unit_amount: 59  }, // €0.59
      { up_to: 2000,       unit_amount: 39  }, // €0.39
      { up_to: 'inf',      unit_amount: 29  }, // €0.29
    ],
    nickname: 'Member usage (graduated)',
  })
  console.log(`✓ Member product: ${member.id}`)
  console.log(`✓ Member price:   ${memberPrice.id}  (graduated tiers)\n`)

  console.log('─────────────────────────────────────────────')
  console.log('Add these to your .env.local:\n')
  console.log(`STRIPE_BASIC_PRICE_ID=${basicPrice.id}`)
  console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`)
  console.log(`STRIPE_MEMBER_PRICE_ID=${memberPrice.id}`)
  console.log('─────────────────────────────────────────────')
}

run().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})

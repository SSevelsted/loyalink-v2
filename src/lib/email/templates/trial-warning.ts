import { emailWrapper, ctaButton, greeting, p, bulletList, signOff, escapeHtml } from '../base'

type TrialWarningData = {
  ownerName: string
  studioName: string
  planLabel: string
  daysLeft: 5 | 1
  hasPaymentMethod: boolean
  customerCount: number
  totalBalance: number
  transactionCount: number
  trialEndDate: string
  currency?: string
  dashboardUrl: string
  billingUrl: string
}

export function trialWarningEmail(data: TrialWarningData): { subject: string; html: string } {
  const {
    ownerName, studioName, planLabel, daysLeft, hasPaymentMethod,
    customerCount, totalBalance, transactionCount, trialEndDate,
    currency = 'kr', dashboardUrl, billingUrl,
  } = data

  const sym = escapeHtml(currency)

  if (daysLeft === 5 && hasPaymentMethod) {
    return fiveDayVariantA({
      ownerName, studioName, planLabel, customerCount, totalBalance, transactionCount, sym, dashboardUrl,
    })
  }
  if (daysLeft === 5 && !hasPaymentMethod) {
    return fiveDayVariantB({
      ownerName, studioName, planLabel, customerCount, totalBalance, transactionCount, sym, trialEndDate, billingUrl,
    })
  }
  if (daysLeft === 1 && hasPaymentMethod) {
    return oneDayVariantA({ ownerName, studioName, planLabel, customerCount })
  }
  return oneDayVariantB({
    ownerName, studioName, customerCount, totalBalance, sym, billingUrl,
  })
}

// --- 5-day Variant A: has payment method ---
function fiveDayVariantA(d: {
  ownerName: string; studioName: string; planLabel: string
  customerCount: number; totalBalance: number; transactionCount: number
  sym: string; dashboardUrl: string
}) {
  const subject = "5 days left \u2014 here's what you've built"

  const stats = bulletList([
    `<strong>${d.customerCount}</strong> client${d.customerCount === 1 ? '' : 's'} have a reason to come back to your studio specifically`,
    `<strong>${d.totalBalance} ${d.sym}</strong> in secured discounts are sitting in their wallets &mdash; money they can only spend with you`,
    `<strong>${d.transactionCount}</strong> transaction${d.transactionCount === 1 ? '' : 's'} logged`,
  ])

  const parts = [
    greeting(d.ownerName),
    p(`Your <strong>${d.planLabel}</strong> trial for <strong>${escapeHtml(d.studioName)}</strong> wraps up in 5 days. After that, your plan activates automatically &mdash; no interruption.`),
    p(`Here&rsquo;s what&rsquo;s already working for you:`),
    stats,
  ]

  if (d.customerCount > 0) {
    parts.push(p(`This is just the start. The real power of a loyalty program is compounding: clients come back, they refer friends, those friends refer more friends. Studios that keep running past the first month typically see referral traffic kick in around week 6-8.`))
    parts.push(p(`Keep building that flywheel.`))
  }

  parts.push(ctaButton('View your dashboard \u2192', d.dashboardUrl))
  parts.push(signOff())

  return { subject, html: emailWrapper(parts.join('')) }
}

// --- 5-day Variant B: no payment method ---
function fiveDayVariantB(d: {
  ownerName: string; studioName: string; planLabel: string
  customerCount: number; totalBalance: number; transactionCount: number
  sym: string; trialEndDate: string; billingUrl: string
}) {
  const subject = "5 days left \u2014 here's what's at stake"

  const stats = bulletList([
    `<strong>${d.customerCount}</strong> client${d.customerCount === 1 ? '' : 's'} now have a reason to come back to you specifically`,
    `<strong>${d.totalBalance} ${d.sym}</strong> in secured discounts are sitting in their wallets &mdash; money they can only spend with you`,
    `<strong>${d.transactionCount}</strong> transaction${d.transactionCount === 1 ? '' : 's'} logged`,
  ])

  const parts = [
    greeting(d.ownerName),
    p(`Your <strong>${d.planLabel}</strong> trial for <strong>${escapeHtml(d.studioName)}</strong> wraps up in 5 days.`),
    p(`So far:`),
    stats,
  ]

  if (d.customerCount > 0) {
    parts.push(p(`That&rsquo;s ${d.customerCount} people who&rsquo;ll think of your studio when they want their next piece &mdash; not because they saw a post, but because they&rsquo;ve got a balance to use. Adding a payment method keeps that engine running and lets the compounding kick in: repeat clients start referring friends, and those friends refer more friends.`))
  } else {
    parts.push(p(`You haven&rsquo;t added any clients yet. The fastest way to see results is to set up your QR code and have your next 3 walk-ins scan it. Takes 30 seconds each.`))
  }

  parts.push(ctaButton('Add payment method \u2192', d.billingUrl))
  parts.push(p(`No payment method by <strong>${d.trialEndDate}</strong>? Your program pauses &mdash; but nothing is lost. You can pick up right where you left off.`))
  parts.push(signOff())

  return { subject, html: emailWrapper(parts.join('')) }
}

// --- 1-day Variant A: has payment method ---
function oneDayVariantA(d: {
  ownerName: string; studioName: string; planLabel: string; customerCount: number
}) {
  const subject = "Your trial ends tomorrow \u2014 you're all set"

  const parts = [
    greeting(d.ownerName),
    p(`Quick heads up: your trial ends tomorrow and your <strong>${d.planLabel}</strong> plan kicks in automatically. Nothing to do on your end.`),
    p(`<strong>${d.customerCount}</strong> client${d.customerCount === 1 ? '' : 's'} are earning cashback at <strong>${escapeHtml(d.studioName)}</strong>. That loyalty compounds &mdash; the longer your program runs, the more clients return, the more they refer, and the less you have to chase new bookings.`),
    p(`Just keep doing what you do. The system works in the background.`),
    signOff(),
  ]

  return { subject, html: emailWrapper(parts.join('')) }
}

// --- 1-day Variant B: no payment method ---
function oneDayVariantB(d: {
  ownerName: string; studioName: string
  customerCount: number; totalBalance: number; sym: string
  billingUrl: string
}) {
  const subject = 'Tomorrow your program pauses'

  const parts = [
    greeting(d.ownerName),
    p(`Your Loyalink trial ends tomorrow.`),
    p(`Right now, <strong>${d.customerCount}</strong> client${d.customerCount === 1 ? '' : 's'} have your studio in their wallet with <strong>${d.totalBalance} ${d.sym}</strong> in secured discounts &mdash; money that can only be spent with you. That&rsquo;s a built-in reason for them to come back instead of browsing Instagram for another artist.`),
    p(`If your program pauses, their passes stay but stop earning. The momentum you&rsquo;ve built &mdash; the referrals starting to form, the repeat visits beginning to compound &mdash; goes on hold.`),
    p(`Adding a payment method takes 2 minutes.`),
    ctaButton('Keep my program running \u2192', d.billingUrl),
    signOff(),
  ]

  return { subject, html: emailWrapper(parts.join('')) }
}

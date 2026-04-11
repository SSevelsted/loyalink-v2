import { emailWrapper, ctaButton, greeting, p, bulletList, signOff } from '../base'
import { escapeHtml } from '@/lib/escape-html'

type SubscriptionConfirmedData = {
  ownerName: string
  studioName: string
  planLabel: string
  isPro: boolean
  automationsUrl: string
}

export function subscriptionConfirmedEmail(data: SubscriptionConfirmedData): { subject: string; html: string } {
  const { ownerName, studioName, planLabel, isPro, automationsUrl } = data

  const subject = "You're live. No more trial."

  const parts = [
    greeting(ownerName),
    p(`Payment confirmed. <strong>${escapeHtml(studioName)}</strong> is now on the <strong>${planLabel}</strong> plan.`),
    p(`Your loyalty program is fully active. No limits, no countdown.`),
  ]

  if (isPro) {
    parts.push(p(`Here&rsquo;s what&rsquo;s unlocked:`))
    parts.push(bulletList([
      `Automated push notifications (re-engage clients who drift)`,
      `Multi-tier loyalty (Silver/Gold/VIP &mdash; reward your best clients more)`,
      `Audience segmentation (target the right clients with the right message)`,
    ]))
    parts.push(p(`One thing worth doing today: set up at least one automation. Studios that activate a &ldquo;we miss you&rdquo; push within the first week see 23% higher return rates in month one.`))
    parts.push(ctaButton('Set up automations \u2192', automationsUrl))
  }

  parts.push(signOff())

  return { subject, html: emailWrapper(parts.join('')) }
}

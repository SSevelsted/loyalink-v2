import { emailWrapper, ctaButton, greeting, p, bulletList, signOff, footerNote } from '../base'

type TrialExpiredData = {
  ownerName: string
  billingUrl: string
}

export function trialExpiredEmail(data: TrialExpiredData): { subject: string; html: string } {
  const { ownerName, billingUrl } = data

  const subject = "Your trial ended \u2014 your clients are still there"

  const html = emailWrapper([
    greeting(ownerName),
    p(`Your 14-day trial has ended and your program is now paused.`),
    p(`Here&rsquo;s what that means:`),
    bulletList([
      `Your clients&rsquo; loyalty cards are still in their wallets`,
      `Their balances are saved`,
      `But cashback stops accruing and push notifications are disabled`,
    ]),
    p(`The moment you add a payment method, everything reactivates. No setup needed &mdash; you&rsquo;re picking up exactly where you left off.`),
    ctaButton('Reactivate my program \u2192', billingUrl),
    p(`If Loyalink isn&rsquo;t the right fit, no hard feelings. But if you&rsquo;re on the fence, reply to this email and I&rsquo;ll personally walk you through what&rsquo;s working for studios like yours.`),
    signOff('Simon'),
    footerNote('Just hit reply &mdash; this goes straight to a real person.'),
  ].join(''))

  return { subject, html }
}

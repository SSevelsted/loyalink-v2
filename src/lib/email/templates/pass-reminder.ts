import { emailWrapper, ctaButton, greeting, p, bulletList, footerNote, escapeHtml } from '../base'

type PassReminderData = {
  customerName: string
  studioName: string
  cashbackRate: number
  passLink: string
}

export function passReminderEmail(data: PassReminderData): { subject: string; html: string } {
  const { customerName, studioName, cashbackRate, passLink } = data

  const studio = escapeHtml(studioName)
  const subject = `Your ${studioName} card is waiting`

  const html = emailWrapper([
    greeting(customerName),
    p(`You signed up for <strong>${studio}</strong>&rsquo;s loyalty program but haven&rsquo;t added the card to your wallet yet.`),
    p(`Here&rsquo;s what you&rsquo;re missing out on:`),
    bulletList([
      `<strong>${cashbackRate}%</strong> cashback on every visit &mdash; automatically added to your balance`,
      `Higher tiers with bigger rewards the more you visit`,
      `Earn cashback when you refer friends`,
      `Exclusive offers sent straight to your lock screen`,
    ]),
    p(`One tap and it&rsquo;s in your Apple or Google Wallet. No app needed.`),
    ctaButton('Add to Wallet \u2192', passLink),
    footerNote('This link expires in 24 hours.'),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

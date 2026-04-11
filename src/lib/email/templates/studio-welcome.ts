import { emailWrapper, ctaButton, greeting, p, signOff, footerNote } from '../base'

type StudioWelcomeData = {
  ownerName: string
  studioName: string
  planLabel: string
  trialEnd: string
  setupUrl: string
}

export function studioWelcomeEmail(data: StudioWelcomeData): { subject: string; html: string } {
  const { ownerName, studioName, planLabel, trialEnd, setupUrl } = data

  const subject = "You're in. Let's get your studio set up."

  const html = emailWrapper([
    greeting(ownerName),
    p(`Welcome to Loyalink. Your <strong>${planLabel}</strong> trial is live &mdash; 14 days, full access, no card needed.`),
    p(`Here&rsquo;s what happens next:`),
    `<ol style="padding-left:20px;margin:0 0 16px;color:#555">
      <li style="margin:0 0 8px">You set up your cashback rates and tiers. Takes about 5 minutes.</li>
      <li style="margin:0 0 8px">We generate your QR code and branded signup page.</li>
      <li style="margin:0 0 8px">Your first client scans it, and their loyalty card lands straight in their Apple or Google Wallet.</li>
    </ol>`,
    p(`That&rsquo;s it. No app for them to download. No tech for you to manage.`),
    ctaButton('Complete your setup \u2192', setupUrl),
    p(`Your trial runs until <strong>${trialEnd}</strong>. Plenty of time to see what repeat clients actually look like.`),
    signOff(),
    footerNote('Questions? Just reply to this email.'),
  ].join(''))

  return { subject, html }
}

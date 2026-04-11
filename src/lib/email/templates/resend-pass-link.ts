import { emailWrapper, ctaButton, greeting, p, footerNote, escapeHtml } from '../base'

type ResendPassLinkData = {
  customerName: string
  studioName: string
  passLink: string
}

export function resendPassLinkEmail(data: ResendPassLinkData): { subject: string; html: string } {
  const { customerName, studioName, passLink } = data

  const studio = escapeHtml(studioName)
  const subject = `Your ${studioName} loyalty card`

  const html = emailWrapper([
    greeting(customerName),
    p(`Here&rsquo;s your link to add your <strong>${studio}</strong> loyalty card to your wallet.`),
    ctaButton('Add to Wallet \u2192', passLink),
    footerNote('This link expires in 24 hours. If you didn&rsquo;t request this, you can safely ignore it.'),
  ].join(''))

  return { subject, html }
}

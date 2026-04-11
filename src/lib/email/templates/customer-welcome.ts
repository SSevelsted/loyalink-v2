import { emailWrapper, ctaButton, greeting, p, bulletList, escapeHtml } from '../base'

type CustomerWelcomeData = {
  customerName: string
  studioName: string
  cashbackRate: number
  balance: number
  tierName: string
  currency: string
  passInstalled: boolean
  passLink: string
}

export function customerWelcomeEmail(data: CustomerWelcomeData): { subject: string; html: string } {
  const {
    customerName, studioName, cashbackRate, balance,
    tierName, currency, passInstalled, passLink,
  } = data

  const sym = escapeHtml(currency)
  const studio = escapeHtml(studioName)
  const subject = `Welcome to ${studioName}`

  const parts = [
    greeting(customerName),
    p(`You&rsquo;re in. Your <strong>${studio}</strong> loyalty card is set up and ready.`),
    p(`Here&rsquo;s how it works:`),
    bulletList([
      `Every time you visit, you earn <strong>${cashbackRate}%</strong> cashback`,
      `Your cashback balance can only be spent at <strong>${studio}</strong>`,
      `The more you visit, the higher your tier and rewards`,
    ]),
    p(`Your current balance: <strong>${Math.round(balance)} ${sym}</strong>`),
    p(`Your tier: <strong>${escapeHtml(tierName)}</strong>`),
  ]

  if (!passInstalled) {
    parts.push(p(`Add your loyalty card to your phone &mdash; it lives right in your Apple or Google Wallet. No app needed.`))
    parts.push(ctaButton('Add to Wallet \u2192', passLink))
  } else {
    parts.push(p(`Your loyalty card is already in your wallet. You&rsquo;re all set.`))
  }

  parts.push(`<p style="color:#555;margin:24px 0 0">See you soon,<br><strong>${studio}</strong></p>`)

  return { subject, html: emailWrapper(parts.join('')) }
}

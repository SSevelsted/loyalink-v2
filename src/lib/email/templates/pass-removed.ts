import { emailWrapper, ctaButton, greeting, p, bulletList, footerNote, escapeHtml, fmtAmount } from '../base'

type PassRemovedData = {
  customerName: string
  studioName: string
  currentBalance: number
  cashbackRate: number
  currency: string
  passLink: string
}

export function passRemovedEmail(data: PassRemovedData): { subject: string; html: string } {
  const { customerName, studioName, currentBalance, cashbackRate, currency, passLink } = data

  const studio = escapeHtml(studioName)
  const subject = 'Your balance is still safe'

  const html = emailWrapper([
    greeting(customerName),
    p(`Looks like your <strong>${studio}</strong> loyalty card was removed from your wallet.`),
    p(`No worries &mdash; your balance of <strong>${fmtAmount(currentBalance, currency)}</strong> and all your rewards are still here. You can re-add the card anytime.`),
    p(`With your card in your wallet, you get:`),
    bulletList([
      `<strong>${cashbackRate}%</strong> cashback on every visit`,
      `Balance updates and exclusive offers on your lock screen`,
      `Cashback for referring friends`,
    ]),
    ctaButton('Re-add to Wallet \u2192', passLink),
    footerNote(`This link expires in 24 hours. If you removed it on purpose, ignore this &mdash; your rewards aren&rsquo;t going anywhere.`),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

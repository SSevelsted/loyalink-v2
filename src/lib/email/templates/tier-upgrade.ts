import { emailWrapper, greeting, p, bulletList, escapeHtml, fmtAmount } from '../base'

type TierUpgradeData = {
  customerName: string
  studioName: string
  newTierName: string
  newCashbackRate: number
  oldCashbackRate: number
  balance: number
  lifetimeCashback: number
  currency: string
}

export function tierUpgradeEmail(data: TierUpgradeData): { subject: string; html: string } {
  const {
    customerName, studioName, newTierName, newCashbackRate,
    oldCashbackRate, balance, lifetimeCashback, currency,
  } = data

  const studio = escapeHtml(studioName)
  const subject = `You just unlocked ${newTierName}`

  const html = emailWrapper([
    greeting(customerName),
    p(`You&rsquo;ve been upgraded to <strong>${escapeHtml(newTierName)}</strong> at <strong>${studio}</strong>.`),
    p(`What this means:`),
    bulletList([
      `Your cashback rate is now <strong>${newCashbackRate}%</strong> (was ${oldCashbackRate}%)`,
      `Every visit earns you more`,
    ]),
    p(`Your current balance: <strong>${fmtAmount(balance, currency)}</strong>`),
    p(`Total earned lifetime: <strong>${fmtAmount(lifetimeCashback, currency)}</strong>`),
    p(`Thanks for being a loyal client. This is well-earned.`),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

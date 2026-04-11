import { emailWrapper, greeting, p, escapeHtml, fmtAmount } from '../base'

type ReferralRewardData = {
  referrerName: string
  referredName: string
  studioName: string
  rewardAmount: number
  newBalance: number
  currency: string
}

export function referralRewardEmail(data: ReferralRewardData): { subject: string; html: string } {
  const { referrerName, referredName, studioName, rewardAmount, newBalance, currency } = data

  const studio = escapeHtml(studioName)
  const subject = `Your referral just earned you ${fmtAmount(rewardAmount, currency)}`

  const html = emailWrapper([
    greeting(referrerName),
    p(`Your friend <strong>${escapeHtml(referredName)}</strong> just visited <strong>${studio}</strong> &mdash; and you earned <strong>${fmtAmount(rewardAmount, currency)}</strong> in cashback for the referral.`),
    p(`Your updated balance: <strong>${fmtAmount(newBalance, currency)}</strong>`),
    p(`Know more people who&rsquo;d love <strong>${studio}</strong>? Every referral that books earns you cashback.`),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

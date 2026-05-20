import { emailWrapper, greetingLine, p, escapeHtml, fmtAmount } from '../base'
import { getEmailTranslations } from '../i18n'

type ReferralRewardData = {
  referrerName: string
  referredName: string
  studioName: string
  rewardAmount: number
  newBalance: number
  currency: string
  language?: string
}

export function referralRewardEmail(data: ReferralRewardData): { subject: string; html: string } {
  const { referrerName, referredName, studioName, rewardAmount, newBalance, currency, language } = data

  const tBase = getEmailTranslations(language)
  const t = tBase.referralReward
  const studio = escapeHtml(studioName)
  const reward = fmtAmount(rewardAmount, currency)
  const subject = t.subject(reward)

  const html = emailWrapper([
    greetingLine(tBase.greeting(referrerName)),
    p(t.intro(escapeHtml(referredName), studio, reward)),
    p(t.updatedBalance(fmtAmount(newBalance, currency))),
    p(t.knowMore(studio)),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

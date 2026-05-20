import { emailWrapper, greetingLine, p, bulletList, escapeHtml, fmtAmount } from '../base'
import { getEmailTranslations } from '../i18n'

type TierUpgradeData = {
  customerName: string
  studioName: string
  newTierName: string
  newCashbackRate: number
  oldCashbackRate: number
  balance: number
  lifetimeCashback: number
  currency: string
  language?: string
}

export function tierUpgradeEmail(data: TierUpgradeData): { subject: string; html: string } {
  const {
    customerName, studioName, newTierName, newCashbackRate,
    oldCashbackRate, balance, lifetimeCashback, currency, language,
  } = data

  const tBase = getEmailTranslations(language)
  const t = tBase.tierUpgrade

  const studio = escapeHtml(studioName)
  const subject = t.subject(newTierName)

  const html = emailWrapper([
    greetingLine(tBase.greeting(customerName)),
    p(t.intro(escapeHtml(newTierName), studio)),
    p(t.whatItMeans),
    bulletList([
      t.bullet1(newCashbackRate, oldCashbackRate),
      t.bullet2,
    ]),
    p(t.yourBalance(fmtAmount(balance, currency))),
    p(t.lifetimeEarned(fmtAmount(lifetimeCashback, currency))),
    p(t.thanksLoyal),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

import { emailWrapper, ctaButton, greetingLine, p, bulletList, escapeHtml, fmtAmount } from '../base'
import { getEmailTranslations } from '../i18n'

type CustomerWelcomeData = {
  customerName: string
  studioName: string
  cashbackRate: number
  balance: number
  tierName: string
  currency: string
  passInstalled: boolean
  passLink: string
  language?: string
}

export function customerWelcomeEmail(data: CustomerWelcomeData): { subject: string; html: string } {
  const {
    customerName, studioName, cashbackRate, balance,
    tierName, currency, passInstalled, passLink, language,
  } = data

  const t = getEmailTranslations(language).customerWelcome
  const tBase = getEmailTranslations(language)
  const studio = escapeHtml(studioName)
  const subject = t.subject(studioName)

  const parts = [
    greetingLine(tBase.greeting(customerName)),
    p(t.intro(studio)),
    p(t.howItWorks),
    bulletList([
      t.bullet1(cashbackRate),
      t.bullet2(studio),
      t.bullet3,
    ]),
    p(t.currentBalance(fmtAmount(balance, currency))),
    p(t.yourTier(escapeHtml(tierName))),
  ]

  if (!passInstalled) {
    parts.push(p(t.addPassBlurb))
    parts.push(ctaButton(t.addPassCta, passLink))
  } else {
    parts.push(p(t.alreadyInWallet))
  }

  parts.push(`<p style="color:#555;margin:24px 0 0">${escapeHtml(t.seeYouSoon)}<br><strong>${studio}</strong></p>`)

  return { subject, html: emailWrapper(parts.join('')) }
}

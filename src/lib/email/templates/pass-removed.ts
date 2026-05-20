import { emailWrapper, ctaButton, greetingLine, p, bulletList, footerNote, escapeHtml, fmtAmount } from '../base'
import { getEmailTranslations } from '../i18n'

type PassRemovedData = {
  customerName: string
  studioName: string
  currentBalance: number
  cashbackRate: number
  currency: string
  passLink: string
  language?: string
}

export function passRemovedEmail(data: PassRemovedData): { subject: string; html: string } {
  const { customerName, studioName, currentBalance, cashbackRate, currency, passLink, language } = data
  const tBase = getEmailTranslations(language)
  const t = tBase.passRemoved

  const studio = escapeHtml(studioName)
  const subject = t.subject

  const html = emailWrapper([
    greetingLine(tBase.greeting(customerName)),
    p(t.intro(studio)),
    p(t.safeBalance(fmtAmount(currentBalance, currency))),
    p(t.withCardYouGet),
    bulletList([
      t.bullet1(cashbackRate),
      t.bullet2,
      t.bullet3,
    ]),
    ctaButton(t.reAddCta, passLink),
    footerNote(t.expiresAndIgnore),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

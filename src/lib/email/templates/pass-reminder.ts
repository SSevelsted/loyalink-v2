import { emailWrapper, ctaButton, greetingLine, p, bulletList, footerNote, escapeHtml } from '../base'
import { getEmailTranslations } from '../i18n'

type PassReminderData = {
  customerName: string
  studioName: string
  cashbackRate: number
  passLink: string
  language?: string
}

export function passReminderEmail(data: PassReminderData): { subject: string; html: string } {
  const { customerName, studioName, cashbackRate, passLink, language } = data
  const tBase = getEmailTranslations(language)
  const t = tBase.passReminder

  const studio = escapeHtml(studioName)
  const subject = t.subject(studioName)

  const html = emailWrapper([
    greetingLine(tBase.greeting(customerName)),
    p(t.intro(studio)),
    p(t.missingOut),
    bulletList([
      t.bullet1(cashbackRate),
      t.bullet2,
      t.bullet3,
      t.bullet4,
    ]),
    p(t.oneTap),
    ctaButton(t.addCta, passLink),
    footerNote(t.linkExpiresShort),
    `<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`,
  ].join(''))

  return { subject, html }
}

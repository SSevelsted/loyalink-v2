import { emailWrapper, ctaButton, greetingLine, p, footerNote, escapeHtml } from '../base'
import { getEmailTranslations } from '../i18n'

type ResendPassLinkData = {
  customerName: string
  studioName: string
  passLink: string
  language?: string
}

export function resendPassLinkEmail(data: ResendPassLinkData): { subject: string; html: string } {
  const { customerName, studioName, passLink, language } = data
  const tBase = getEmailTranslations(language)
  const t = tBase.resendPassLink

  const studio = escapeHtml(studioName)
  const subject = t.subject(studioName)

  const html = emailWrapper([
    greetingLine(tBase.greeting(customerName)),
    p(t.intro(studio)),
    ctaButton(t.addCta, passLink),
    footerNote(t.expires),
  ].join(''))

  return { subject, html }
}

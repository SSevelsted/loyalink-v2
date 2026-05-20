import { emailWrapper, ctaButton, greetingLine, p, escapeHtml, fmtAmount } from '../base'
import { getEmailTranslations } from '../i18n'

type WinBackData = {
  customerName: string
  studioName: string
  balance: number
  currency: string
  hasCashbackBoost: boolean
  boostedRate?: number
  normalRate?: number
  boostExpiry?: string
  balanceLink: string
  language?: string
}

export function winBackEmail(data: WinBackData): { subject: string; html: string } {
  const {
    customerName, studioName, balance, currency,
    hasCashbackBoost, boostedRate, normalRate, boostExpiry,
    balanceLink, language,
  } = data

  const tBase = getEmailTranslations(language)
  const t = tBase.winBack
  const studio = escapeHtml(studioName)
  const balanceFmt = fmtAmount(balance, currency)
  const subject = t.subject(balanceFmt, studioName)

  const parts = [
    greetingLine(tBase.greeting(customerName)),
    p(t.intro(studio, balanceFmt)),
  ]

  if (hasCashbackBoost && boostedRate && normalRate && boostExpiry) {
    parts.push(p(t.boostNote(boostedRate, normalRate, escapeHtml(boostExpiry))))
  }

  parts.push(ctaButton(t.seeBalanceCta, balanceLink))
  parts.push(`<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`)

  return { subject, html: emailWrapper(parts.join('')) }
}

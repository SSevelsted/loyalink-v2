import { emailWrapper, ctaButton, greeting, p, footerNote, escapeHtml, fmtAmount } from '../base'

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
}

export function winBackEmail(data: WinBackData): { subject: string; html: string } {
  const {
    customerName, studioName, balance, currency,
    hasCashbackBoost, boostedRate, normalRate, boostExpiry,
    balanceLink,
  } = data

  const studio = escapeHtml(studioName)
  const subject = `You have ${fmtAmount(balance, currency)} waiting at ${studioName}`

  const parts = [
    greeting(customerName),
    p(`It&rsquo;s been a while since your last visit to <strong>${studio}</strong>. Just a heads up &mdash; your cashback balance of <strong>${fmtAmount(balance, currency)}</strong> is still here, ready to use.`),
  ]

  if (hasCashbackBoost && boostedRate && normalRate && boostExpiry) {
    parts.push(p(`Right now, your cashback rate is temporarily boosted to <strong>${boostedRate}%</strong> (normally ${normalRate}%). This bonus expires on <strong>${escapeHtml(boostExpiry)}</strong>.`))
  }

  parts.push(ctaButton('See your balance \u2192', balanceLink))
  parts.push(`<p style="color:#555;margin:16px 0 0"><strong>${studio}</strong></p>`)

  return { subject, html: emailWrapper(parts.join('')) }
}

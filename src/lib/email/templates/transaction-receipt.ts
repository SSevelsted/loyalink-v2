import { emailWrapper, greetingLine, p, successBanner, escapeHtml, fmtAmount } from '../base'
import { getEmailTranslations } from '../i18n'

type TransactionReceiptData = {
  customerName: string
  studioName: string
  currency: string
  amount: number
  balanceUsed: number
  chargeOnPOS: number | null
  cashbackEarned: number
  cashbackRate: number
  newBalance: number
  tierName: string
  tierUpgraded: boolean
  newTierName?: string
  newCashbackRate?: number
  // Next tier nudge
  nextTierName?: string
  nextTierRate?: number
  amountToNextTier?: number
  language?: string
}

export function transactionReceiptEmail(data: TransactionReceiptData): { subject: string; html: string } {
  const {
    customerName, studioName, currency, amount, balanceUsed,
    chargeOnPOS, cashbackEarned, cashbackRate, newBalance,
    tierName, tierUpgraded, newTierName, newCashbackRate,
    nextTierName, nextTierRate, amountToNextTier, language,
  } = data

  const tBase = getEmailTranslations(language)
  const t = tBase.transactionReceipt

  const studio = escapeHtml(studioName)
  const fmt = (n: number) => fmtAmount(n, currency)

  const subject = cashbackEarned > 0
    ? t.subjectEarned(studioName, fmt(cashbackEarned))
    : t.subjectReceipt(studioName)

  const parts = [greetingLine(tBase.greeting(customerName))]

  // Tier upgrade banner
  if (tierUpgraded && newTierName) {
    parts.push(successBanner(
      t.upgradeBanner(escapeHtml(newTierName), newCashbackRate ?? cashbackRate)
    ))
  }

  parts.push(p(t.breakdown))

  // Build table rows
  const rows: string[] = []
  rows.push(row(t.rowPurchase, fmt(amount)))
  if (balanceUsed > 0) {
    rows.push(row(t.rowBalanceUsed, `-${fmt(balanceUsed)}`, '#10B981'))
  }
  if (chargeOnPOS != null && chargeOnPOS !== amount) {
    rows.push(row(t.rowCharged, fmt(chargeOnPOS)))
  }
  if (cashbackEarned > 0) {
    rows.push(row(t.rowCashback(cashbackRate), `+${fmt(cashbackEarned)}`, '#10B981'))
  }
  rows.push(row(t.rowYourBalance, fmt(newBalance), undefined, true))

  parts.push(`<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">${rows.join('')}</table>`)

  parts.push(p(t.yourTier(escapeHtml(tierUpgraded && newTierName ? newTierName : tierName))))

  // Next tier nudge
  if (nextTierName && amountToNextTier != null && amountToNextTier > 0) {
    parts.push(p(t.spendMoreNudge(fmt(amountToNextTier), escapeHtml(nextTierName), nextTierRate ?? 0)))
  }

  parts.push(p(t.thanksFor(studio)))

  return { subject, html: emailWrapper(parts.join('')) }
}

function row(label: string, value: string, color?: string, bold?: boolean): string {
  const valStyle = [
    'padding:6px 0;text-align:right',
    color ? `color:${color}` : '',
    bold ? 'font-weight:700' : 'font-weight:500',
  ].filter(Boolean).join(';')

  const labelStyle = bold
    ? 'padding:8px 0 0;font-weight:600;border-top:1px solid #eee'
    : 'padding:6px 0;color:#555'

  return `<tr><td style="${labelStyle}">${label}</td><td style="${valStyle}${bold ? ';border-top:1px solid #eee' : ''}">${value}</td></tr>`
}

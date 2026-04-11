import { emailWrapper, greeting, p, successBanner, escapeHtml, fmtAmount } from '../base'

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
}

export function transactionReceiptEmail(data: TransactionReceiptData): { subject: string; html: string } {
  const {
    customerName, studioName, currency, amount, balanceUsed,
    chargeOnPOS, cashbackEarned, cashbackRate, newBalance,
    tierName, tierUpgraded, newTierName, newCashbackRate,
    nextTierName, nextTierRate, amountToNextTier,
  } = data

  const studio = escapeHtml(studioName)
  const sym = escapeHtml(currency)
  const fmt = (n: number) => fmtAmount(n, currency)

  const subject = cashbackEarned > 0
    ? `${studioName} \u2014 ${fmt(cashbackEarned)} earned`
    : `Your receipt from ${studioName}`

  const parts = [greeting(customerName)]

  // Tier upgrade banner
  if (tierUpgraded && newTierName) {
    parts.push(successBanner(
      `\ud83c\udf89 You&rsquo;ve been upgraded to ${escapeHtml(newTierName)}! Your new cashback rate: ${newCashbackRate ?? cashbackRate}%.`
    ))
  }

  parts.push(p(`Here&rsquo;s your breakdown:`))

  // Build table rows
  const rows: string[] = []
  rows.push(row('Purchase', fmt(amount)))
  if (balanceUsed > 0) {
    rows.push(row('Balance used', `-${fmt(balanceUsed)}`, '#10B981'))
  }
  if (chargeOnPOS != null && chargeOnPOS !== amount) {
    rows.push(row('Charged', fmt(chargeOnPOS)))
  }
  if (cashbackEarned > 0) {
    rows.push(row(`Cashback earned (${cashbackRate}%)`, `+${fmt(cashbackEarned)}`, '#10B981'))
  }
  rows.push(row('Your balance', fmt(newBalance), undefined, true))

  parts.push(`<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">${rows.join('')}</table>`)

  parts.push(p(`Your tier: <strong>${escapeHtml(tierUpgraded && newTierName ? newTierName : tierName)}</strong>`))

  // Next tier nudge
  if (nextTierName && amountToNextTier != null && amountToNextTier > 0) {
    parts.push(p(`Spend <strong>${Math.round(amountToNextTier)} ${sym}</strong> more to unlock <strong>${escapeHtml(nextTierName)}</strong> and earn <strong>${nextTierRate}%</strong> cashback.`))
  }

  parts.push(p(`Thanks for choosing <strong>${studio}</strong>.`))

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

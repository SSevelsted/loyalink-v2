export type CurrencyConfig = {
  symbol: string
  exampleAmount: number
  prefix: boolean
  thousandsSep: string
}

export const CURRENCY_MAP: Record<string, CurrencyConfig> = {
  kr:  { symbol: 'kr',  exampleAmount: 5000, prefix: false, thousandsSep: ' ' },
  dkk: { symbol: 'kr',  exampleAmount: 5000, prefix: false, thousandsSep: ' ' },
  sek: { symbol: 'kr',  exampleAmount: 7000, prefix: false, thousandsSep: ' ' },
  nok: { symbol: 'kr',  exampleAmount: 7000, prefix: false, thousandsSep: ' ' },
  eur: { symbol: '€',   exampleAmount: 600,  prefix: false, thousandsSep: ' ' },
  usd: { symbol: '$',   exampleAmount: 700,  prefix: true,  thousandsSep: ',' },
  gbp: { symbol: '£',   exampleAmount: 700,  prefix: true,  thousandsSep: ',' },
  chf: { symbol: 'CHF', exampleAmount: 600,  prefix: false, thousandsSep: ' ' },
  pln: { symbol: 'zł',  exampleAmount: 3000, prefix: false, thousandsSep: ' ' },
  czk: { symbol: 'Kč',  exampleAmount: 15000, prefix: false, thousandsSep: ' ' },
  aud: { symbol: 'A$',  exampleAmount: 1000, prefix: true,  thousandsSep: ',' },
  cad: { symbol: 'C$',  exampleAmount: 900,  prefix: true,  thousandsSep: ',' },
}

export function getCurrencyConfig(currency: string): CurrencyConfig {
  return CURRENCY_MAP[currency.toLowerCase()] ?? { symbol: currency, exampleAmount: 5000, prefix: false, thousandsSep: ' ' }
}

export function formatAmount(amount: number, cfg: CurrencyConfig): string {
  const rounded = Math.round(amount)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, cfg.thousandsSep)
  return cfg.prefix ? `${cfg.symbol}${formatted}` : `${formatted} ${cfg.symbol}`
}

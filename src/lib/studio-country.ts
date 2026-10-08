// The studio's country, for the default phone code on the join and refer
// pages (join-form.tsx falls back to +45 when it gets none).
//
// The studio's own address_country wins. A studio without one (every studio
// StreamInk created before 8 Oct 2026) gets the country its language points
// to, then its currency. A German studio with no address then opens on +49,
// not +45. Owner decision 2026-10-08.

/** Language code (as stored in studio settings) to country. */
const LANGUAGE_COUNTRY: Record<string, string> = {
  de: 'DE',
  da: 'DK',
  sv: 'SE',
  nb: 'NO',
  nn: 'NO',
  no: 'NO',
  fi: 'FI',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
  nl: 'NL',
  pl: 'PL',
  pt: 'PT',
}

/** Currency to country. EUR is left out: many countries share it, the language decides. */
const CURRENCY_COUNTRY: Record<string, string> = {
  DKK: 'DK',
  SEK: 'SE',
  NOK: 'NO',
  CHF: 'CH',
  GBP: 'GB',
  USD: 'US',
  PLN: 'PL',
  ISK: 'IS',
}

function code(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The studio's country as an ISO code (DE, SE, ...), or undefined when nothing
 * points to one. Pure.
 */
export function studioCountry(opts: { country?: unknown; language?: unknown; currency?: unknown }): string | undefined {
  const own = code(opts.country).toUpperCase()
  if (own) return own
  const lang = code(opts.language).toLowerCase().split(/[-_]/)[0]
  if (lang && LANGUAGE_COUNTRY[lang]) return LANGUAGE_COUNTRY[lang]
  const currency = code(opts.currency).toUpperCase()
  if (currency && CURRENCY_COUNTRY[currency]) return CURRENCY_COUNTRY[currency]
  return undefined
}

// Phone country codes for the sign-up and "send a gift" forms.

export const COUNTRY_CODES = [
  { code: '+45', flag: '\u{1F1E9}\u{1F1F0}', country: 'DK' },
  { code: '+46', flag: '\u{1F1F8}\u{1F1EA}', country: 'SE' },
  { code: '+47', flag: '\u{1F1F3}\u{1F1F4}', country: 'NO' },
  { code: '+358', flag: '\u{1F1EB}\u{1F1EE}', country: 'FI' },
  { code: '+49', flag: '\u{1F1E9}\u{1F1EA}', country: 'DE' },
  { code: '+44', flag: '\u{1F1EC}\u{1F1E7}', country: 'GB' },
  { code: '+1', flag: '\u{1F1FA}\u{1F1F8}', country: 'US' },
  { code: '+33', flag: '\u{1F1EB}\u{1F1F7}', country: 'FR' },
  { code: '+34', flag: '\u{1F1EA}\u{1F1F8}', country: 'ES' },
  { code: '+39', flag: '\u{1F1EE}\u{1F1F9}', country: 'IT' },
  { code: '+31', flag: '\u{1F1F3}\u{1F1F1}', country: 'NL' },
  { code: '+43', flag: '\u{1F1E6}\u{1F1F9}', country: 'AT' },
  { code: '+41', flag: '\u{1F1E8}\u{1F1ED}', country: 'CH' },
  { code: '+48', flag: '\u{1F1F5}\u{1F1F1}', country: 'PL' },
  { code: '+351', flag: '\u{1F1F5}\u{1F1F9}', country: 'PT' },
  { code: '+32', flag: '\u{1F1E7}\u{1F1EA}', country: 'BE' },
  { code: '+353', flag: '\u{1F1EE}\u{1F1EA}', country: 'IE' },
  { code: '+354', flag: '\u{1F1EE}\u{1F1F8}', country: 'IS' },
  { code: '+91', flag: '\u{1F1EE}\u{1F1F3}', country: 'IN' },
  { code: '+61', flag: '\u{1F1E6}\u{1F1FA}', country: 'AU' },
]

/** The dial code for an ISO country (studio address_country); +45 when unknown. */
export function countryCodeFor(country: string | null | undefined): string {
  return COUNTRY_CODES.find((c) => c.country === (country ?? '').toUpperCase())?.code ?? '+45'
}

/** "+45" + "20 12 34 56" -> "+4520123456" (a leading 0 of the national number is dropped). */
export function toE164(countryCode: string, national: string): string {
  const digits = national.replace(/\D/g, '').replace(/^0+/, '')
  return digits ? `${countryCode}${digits}` : ''
}

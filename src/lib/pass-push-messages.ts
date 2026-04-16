type Lang = 'en' | 'da' | 'sv' | 'no' | 'de' | 'fr' | 'es' | 'nl' | 'pl'

const SUPPORTED: Lang[] = ['en', 'da', 'sv', 'no', 'de', 'fr', 'es', 'nl', 'pl']

function normalizeLang(input: string | null | undefined): Lang {
  const lower = (input || 'en').toLowerCase().split('-')[0]
  return (SUPPORTED as string[]).includes(lower) ? (lower as Lang) : 'en'
}

function formatCurrency(amount: number, currency: string, lang: Lang): string {
  try {
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

type TierUpgrade = { name: string; cashbackRate: number }
type Cashback = { amount: number; rate: number; newBalance: number; currency: string }

type MessageStrings = {
  tier: (name: string, rate: number) => string
  cashback: (amt: string, rate: number, bal: string) => string
  combined: (tierName: string, rate: number, amt: string, bal: string) => string
}

const STRINGS: Record<Lang, MessageStrings> = {
  en: {
    tier: (n, r) => `Upgraded to ${n}! You now earn ${r}% cashback.`,
    cashback: (a, r, b) => `You earned ${a} (${r}% cashback). New balance: ${b}.`,
    combined: (n, r, a, b) => `Upgraded to ${n}! You now earn ${r}% cashback. New balance: ${b}.`,
  },
  da: {
    tier: (n, r) => `Opgraderet til ${n}! Du optjener nu ${r}% cashback.`,
    cashback: (a, r, b) => `Du fik ${a} (${r}% cashback). Ny saldo: ${b}.`,
    combined: (n, r, _a, b) => `Opgraderet til ${n}! Du optjener nu ${r}% cashback. Ny saldo: ${b}.`,
  },
  sv: {
    tier: (n, r) => `Uppgraderad till ${n}! Du tjänar nu ${r}% cashback.`,
    cashback: (a, r, b) => `Du fick ${a} (${r}% cashback). Nytt saldo: ${b}.`,
    combined: (n, r, _a, b) => `Uppgraderad till ${n}! Du tjänar nu ${r}% cashback. Nytt saldo: ${b}.`,
  },
  no: {
    tier: (n, r) => `Oppgradert til ${n}! Du tjener nå ${r}% cashback.`,
    cashback: (a, r, b) => `Du fikk ${a} (${r}% cashback). Ny saldo: ${b}.`,
    combined: (n, r, _a, b) => `Oppgradert til ${n}! Du tjener nå ${r}% cashback. Ny saldo: ${b}.`,
  },
  de: {
    tier: (n, r) => `Hochgestuft zu ${n}! Du erhältst jetzt ${r}% Cashback.`,
    cashback: (a, r, b) => `Du hast ${a} erhalten (${r}% Cashback). Neuer Saldo: ${b}.`,
    combined: (n, r, _a, b) => `Hochgestuft zu ${n}! Du erhältst jetzt ${r}% Cashback. Neuer Saldo: ${b}.`,
  },
  fr: {
    tier: (n, r) => `Passé au niveau ${n} ! Vous gagnez désormais ${r}% de cashback.`,
    cashback: (a, r, b) => `Vous avez gagné ${a} (${r}% de cashback). Nouveau solde : ${b}.`,
    combined: (n, r, _a, b) => `Passé au niveau ${n} ! Vous gagnez désormais ${r}% de cashback. Nouveau solde : ${b}.`,
  },
  es: {
    tier: (n, r) => `¡Ascendido a ${n}! Ahora ganas ${r}% de cashback.`,
    cashback: (a, r, b) => `Ganaste ${a} (${r}% de cashback). Nuevo saldo: ${b}.`,
    combined: (n, r, _a, b) => `¡Ascendido a ${n}! Ahora ganas ${r}% de cashback. Nuevo saldo: ${b}.`,
  },
  nl: {
    tier: (n, r) => `Gepromoveerd naar ${n}! Je verdient nu ${r}% cashback.`,
    cashback: (a, r, b) => `Je verdiende ${a} (${r}% cashback). Nieuw saldo: ${b}.`,
    combined: (n, r, _a, b) => `Gepromoveerd naar ${n}! Je verdient nu ${r}% cashback. Nieuw saldo: ${b}.`,
  },
  pl: {
    tier: (n, r) => `Awans do ${n}! Otrzymujesz teraz ${r}% cashback.`,
    cashback: (a, r, b) => `Zarobiłeś ${a} (${r}% cashback). Nowe saldo: ${b}.`,
    combined: (n, r, _a, b) => `Awans do ${n}! Otrzymujesz teraz ${r}% cashback. Nowe saldo: ${b}.`,
  },
}

export function buildTransactionPushMessage(params: {
  language: string | null | undefined
  tierUpgrade: TierUpgrade | null
  cashback: Cashback | null
}): string | null {
  const { tierUpgrade, cashback } = params
  if (!tierUpgrade && !cashback) return null

  const lang = normalizeLang(params.language)
  const s = STRINGS[lang]

  if (tierUpgrade && cashback) {
    const amt = formatCurrency(cashback.amount, cashback.currency, lang)
    const bal = formatCurrency(cashback.newBalance, cashback.currency, lang)
    return s.combined(tierUpgrade.name, tierUpgrade.cashbackRate, amt, bal)
  }

  if (tierUpgrade) {
    return s.tier(tierUpgrade.name, tierUpgrade.cashbackRate)
  }

  const amt = formatCurrency(cashback!.amount, cashback!.currency, lang)
  const bal = formatCurrency(cashback!.newBalance, cashback!.currency, lang)
  return s.cashback(amt, cashback!.rate, bal)
}

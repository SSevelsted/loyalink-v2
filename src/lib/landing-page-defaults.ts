import { getSignupTranslations, normalizeLanguage } from '@/lib/i18n/signup'

const DEFAULT_LANGUAGES = ['en', 'da', 'sv', 'no', 'nb', 'de', 'fr', 'es', 'nl', 'pl'] as const
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  en: 'Sign up and get your digital loyalty card instantly.',
  da: 'Tilmeld dig og få dit digitale loyalitetskort med det samme.',
  sv: 'Registrera dig och få ditt digitala lojalitetskort direkt.',
  no: 'Registrer deg og få det digitale lojalitetskortet ditt med en gang.',
  nb: 'Registrer deg og få det digitale lojalitetskortet ditt med en gang.',
  de: 'Melde dich an und erhalte deine digitale Treuekarte sofort.',
  fr: 'Inscrivez-vous et recevez immédiatement votre carte de fidélité numérique.',
  es: 'Regístrate y recibe tu tarjeta de fidelidad digital al instante.',
  nl: 'Meld je aan en ontvang direct je digitale loyaliteitskaart.',
  pl: 'Dołącz i od razu odbierz cyfrową kartę lojalnościową.',
}

export type LandingPageCopyField =
  | 'headline'
  | 'description'
  | 'buttonText'
  | 'successHeading'
  | 'successMessage'

export type LandingPageDefaultCopy = Record<LandingPageCopyField, string>

type LandingPageDefaultSettings = {
  buttonText?: string
  successHeading?: string
  successMessage?: string
}

function normalizeCopy(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[!！]\s*$/, '')
}

export function getDefaultLandingPageCopy(
  studioName: string | null | undefined,
  language: string | null | undefined,
): LandingPageDefaultCopy {
  const t = getSignupTranslations(language)
  const normalizedLanguage = normalizeLanguage(language)
  const displayName = studioName?.trim() || 'your studio'

  return {
    headline: t.welcomeMetaTitle(displayName),
    description: DEFAULT_DESCRIPTIONS[normalizedLanguage] ?? DEFAULT_DESCRIPTIONS.en,
    buttonText: t.joinButton,
    successHeading: t.youreIn,
    successMessage: t.welcomeYourCardReady('{name}'),
  }
}

export function isDefaultLandingPageCopy(
  value: string | null | undefined,
  field: LandingPageCopyField,
  studioName: string | null | undefined,
) {
  if (!value?.trim()) return true
  const normalized = normalizeCopy(value)

  return DEFAULT_LANGUAGES.some(
    (language) => normalizeCopy(getDefaultLandingPageCopy(studioName, language)[field]) === normalized,
  )
}

export function resolveLandingPageCopy(
  value: string | null | undefined,
  field: LandingPageCopyField,
  studioName: string | null | undefined,
  language: string | null | undefined,
) {
  if (isDefaultLandingPageCopy(value, field, studioName)) {
    return getDefaultLandingPageCopy(studioName, language)[field]
  }
  return value ?? ''
}

export function localizeLandingPageSettingsDefaults<TSettings extends LandingPageDefaultSettings>(
  settings: TSettings,
  studioName: string | null | undefined,
  language: string | null | undefined,
) {
  const defaults = getDefaultLandingPageCopy(studioName, language)
  const nextSettings = { ...settings }

  if (isDefaultLandingPageCopy(nextSettings.buttonText, 'buttonText', studioName)) {
    nextSettings.buttonText = defaults.buttonText
  }
  if (isDefaultLandingPageCopy(nextSettings.successHeading, 'successHeading', studioName)) {
    nextSettings.successHeading = defaults.successHeading
  }
  if (isDefaultLandingPageCopy(nextSettings.successMessage, 'successMessage', studioName)) {
    nextSettings.successMessage = defaults.successMessage
  }

  return nextSettings
}

export function localizeLandingPageDefaults<TSettings extends LandingPageDefaultSettings>(
  params: {
    studioName: string | null | undefined
    language: string | null | undefined
    headline: string | null | undefined
    description: string | null | undefined
    settings: TSettings
  },
) {
  return {
    headline: resolveLandingPageCopy(params.headline, 'headline', params.studioName, params.language),
    description: resolveLandingPageCopy(params.description, 'description', params.studioName, params.language),
    settings: localizeLandingPageSettingsDefaults(params.settings, params.studioName, params.language),
  }
}

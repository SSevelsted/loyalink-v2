import { CURRENCY_MAP } from './currency'

// Shared currency + language option lists for market/landing-page pickers
// (setup wizard step 0, Settings → Landing Page). Single source of truth so
// the onboarding wizard and the settings editor never drift apart.

export const CURRENCY_OPTIONS = Object.entries(CURRENCY_MAP)
  // 'kr' is an alias of dkk/sek/nok; hide it so the list shows real ISO codes.
  .filter(([key]) => key !== 'kr')
  .map(([key, cfg]) => ({ value: key, label: `${key.toUpperCase()} (${cfg.symbol})` }))

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'da', label: 'Danish (Dansk)' },
  { value: 'sv', label: 'Swedish (Svenska)' },
  { value: 'no', label: 'Norwegian (Norsk)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'nl', label: 'Dutch (Nederlands)' },
  { value: 'pl', label: 'Polish (Polski)' },
]

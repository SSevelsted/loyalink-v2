import { getSignupTranslations } from '@/lib/i18n/signup'

interface OpenInSafariProps {
  /** Absolute https URL of this same pass page. */
  passPageUrl: string
  language?: string
}

/**
 * Shown instead of the Wallet redirect when the pass link was opened inside an
 * app's embedded browser, which cannot install a .pkpass.
 *
 * The button re-opens *this page* in Safari rather than linking to the pass
 * file, so the normal hand-off runs there. `x-safari-https://` is honoured by
 * most in-app browsers; the written instruction covers the ones that ignore it.
 */
export function OpenInSafari({ passPageUrl, language }: OpenInSafariProps) {
  const t = getSignupTranslations(language)
  const safariUrl = `x-safari-${passPageUrl}`

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.passAddToWallet}</h1>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {t.passInAppExplainer}
        </p>

        <a
          href={safariUrl}
          className="w-full rounded-xl bg-foreground px-6 py-3.5 text-sm font-semibold text-background"
        >
          {t.addInBrowser}
        </a>
      </div>
    </div>
  )
}

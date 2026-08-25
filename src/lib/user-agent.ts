/**
 * User-agent sniffing for the wallet hand-off.
 *
 * A .pkpass can only reach Apple Wallet through a browser that knows how to
 * hand the file to the system. Embedded WKWebViews — the "in-app browser" that
 * opens when someone taps a link inside WhatsApp, Instagram or Messenger — do
 * not, and render the raw ZIP as text instead.
 */

/** Apps that announce themselves in the UA string. */
const IN_APP_TOKENS = [
  /FBAN|FBAV|FB_IAB/i, // Facebook / Messenger
  /Instagram/i,
  /WhatsApp/i,
  /Line\//i,
  /MicroMessenger/i, // WeChat
  /Snapchat/i,
  /TikTok|BytedanceWebview/i,
  /Twitter/i,
  /LinkedInApp/i,
]

export function isIOS(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent)
}

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent)
}

/**
 * True when the request came from an embedded browser rather than a real one.
 *
 * WhatsApp's iOS webview sends no app token at all, so the reliable signal is
 * the missing `Safari/` product token: Mobile Safari always sends one, and so
 * do Chrome (`CriOS`) and Firefox (`FxiOS`) on iOS, which can both add passes.
 * A bare `AppleWebKit … Mobile/15E148` with no `Safari/` is a WKWebView.
 */
export function isInAppBrowser(userAgent: string): boolean {
  if (!userAgent) return false
  if (IN_APP_TOKENS.some((token) => token.test(userAgent))) return true
  return isIOS(userAgent) && !/Safari\//.test(userAgent)
}

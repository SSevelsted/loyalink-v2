import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ai.loyalink.app',
  appName: 'Loyalink',
  server: {
    url: 'https://my.loyalink.ai/login',
    cleartext: false,
    allowNavigation: ['my.loyalink.ai', '*.loyalink.ai', '*.supabase.co', '*.stripe.com'],
    // Branded retry page loaded from the local server when the main frame
    // fails to load (e.g. transient ERR_NAME_NOT_RESOLVED on Android WebView).
    errorPath: 'error.html',
  },
  ios: {
    scheme: 'Loyalink',
    contentInset: 'never',
    backgroundColor: '#09090b',
    preferredContentMode: 'mobile',
    webContentsDebuggingEnabled: true,
    // Server reads this UA suffix to block business-account registration
    // on native (App Store guideline 3.1.1). See src/lib/native-request.ts.
    appendUserAgent: 'LoyalinkApp/native',
  },
  android: {
    backgroundColor: '#09090b',
    appendUserAgent: 'LoyalinkApp/native',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#09090b',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
    },
  },
}

export default config

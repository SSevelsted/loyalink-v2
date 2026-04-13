import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ai.loyalink.app',
  appName: 'Loyalink',
  server: {
    url: 'https://my.loyalink.ai/login',
    cleartext: false,
    allowNavigation: ['my.loyalink.ai', '*.loyalink.ai', '*.supabase.co', '*.stripe.com'],
  },
  ios: {
    scheme: 'Loyalink',
    contentInset: 'automatic',
    backgroundColor: '#09090b',
    preferredContentMode: 'mobile',
    webContentsDebuggingEnabled: true,
  },
  android: {
    backgroundColor: '#09090b',
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

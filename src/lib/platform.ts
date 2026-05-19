import { Capacitor } from '@capacitor/core'

/** True when running inside the native iOS/Android shell */
export const isNative = () => Capacitor.isNativePlatform()

/** Returns 'ios' | 'android' | 'web' */
export const getPlatform = () => Capacitor.getPlatform()

/**
 * Detects the mobile OS from the browser user-agent — for mobile *web*
 * (e.g. Safari on an iPhone), not the native shell. Returns null on
 * desktop or during SSR. Use this to decide whether to surface an
 * "open in app" deep link; use isNative() to detect the app itself.
 */
export function getMobileOS(): 'ios' | 'android' | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  // iPadOS Safari reports a Mac UA by default — fall back to touch points.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios'
  return null
}

/** Light haptic tap on native, no-op on web */
export async function hapticTap() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // ignore
  }
}

/** Success haptic on native */
export async function hapticSuccess() {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // ignore
  }
}

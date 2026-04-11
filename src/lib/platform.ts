import { Capacitor } from '@capacitor/core'

/** True when running inside the native iOS/Android shell */
export const isNative = () => Capacitor.isNativePlatform()

/** Returns 'ios' | 'android' | 'web' */
export const getPlatform = () => Capacitor.getPlatform()

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

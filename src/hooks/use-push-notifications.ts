'use client'

import { useEffect, useRef } from 'react'
import { isNative } from '@/lib/platform'
import { createClient } from '@/lib/supabase/client'

/**
 * Registers the device for push notifications on native platforms.
 * Stores the device token in Supabase so the server can send pushes.
 * No-op on web.
 */
export function usePushNotifications(userId: string | undefined) {
  const registered = useRef(false)

  useEffect(() => {
    if (!userId || !isNative() || registered.current) return
    registered.current = true

    void registerPush(userId)
  }, [userId])
}

async function registerPush(userId: string) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const { getPlatform } = await import('@/lib/platform')

    const { receive } = await PushNotifications.checkPermissions()
    if (receive !== 'granted') {
      const { receive: result } = await PushNotifications.requestPermissions()
      if (result !== 'granted') return
    }

    await PushNotifications.register()

    PushNotifications.addListener('registration', async (token) => {
      const supabase = createClient()
      const platform = getPlatform() // 'ios' | 'android'

      // Upsert device token (one per user+platform)
      await supabase.from('device_tokens').upsert(
        {
          user_id: userId,
          token: token.value,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      )
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] Registration failed:', err)
    })
  } catch {
    // Push not available — ignore
  }
}

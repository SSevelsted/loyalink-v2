// Browser-side "Add to Apple/Google Wallet" after a sign-up. Shared by the
// referral success page and the friend landing page's last step.

const PASS_SERVICE = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export function detectWalletPlatform(): 'apple' | 'google' {
  if (typeof navigator === 'undefined') return 'apple'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'google'
  if (/iphone|ipad|ipod/i.test(ua)) return 'apple'
  if (/CrOS/i.test(ua)) return 'google'
  if (/macintosh|mac os/i.test(ua)) return 'apple'
  return 'apple'
}

/**
 * Open the wallet pass for targetPlatform. passUrl/passPlatform are what the
 * sign-up stored (may be null); when they do not fit the target, a fresh pass
 * is generated with the customer access token.
 */
export async function openWalletPass({
  customerId,
  customerAccessToken,
  passUrl,
  passPlatform,
  targetPlatform,
}: {
  customerId: string
  customerAccessToken: string
  passUrl: string | null
  passPlatform: 'apple' | 'google'
  targetPlatform: 'apple' | 'google'
}): Promise<void> {
  // Track the download
  try {
    await fetch(`/api/loyalty/${customerId}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAccessToken}`,
      },
      body: JSON.stringify({ event: 'pass_downloaded' }),
    })
  } catch {
    // Non-critical
  }

  if (targetPlatform === 'google') {
    // The stored pass_url may be an intermediate endpoint that returns JSON
    // with the real saveUrl: resolve it before navigating.
    let googleSaveUrl = passPlatform === 'google' ? passUrl : null

    if (googleSaveUrl && !googleSaveUrl.includes('pay.google.com')) {
      try {
        const res = await fetch(googleSaveUrl)
        if (res.ok) {
          const data = await res.json()
          if (data.saveUrl) googleSaveUrl = data.saveUrl
        }
      } catch {
        googleSaveUrl = null
      }
    }

    if (!googleSaveUrl) {
      try {
        const res = await fetch('/api/pass/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerAccessToken}`,
          },
          body: JSON.stringify({ customerId, platform: 'google' }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.saveUrl) {
            const url = data.saveUrl.startsWith('http') ? data.saveUrl : `${PASS_SERVICE}${data.saveUrl}`
            if (!url.includes('pay.google.com')) {
              const saveRes = await fetch(url)
              if (saveRes.ok) {
                const saveData = await saveRes.json()
                if (saveData.saveUrl) googleSaveUrl = saveData.saveUrl
              }
            } else {
              googleSaveUrl = url
            }
          }
        }
      } catch {
        // Non-critical
      }
    }

    if (googleSaveUrl) window.open(googleSaveUrl, '_blank')
    return
  }

  // Apple: use the stored URL directly or generate a new one
  if (passPlatform === 'apple' && passUrl) {
    const sep = passUrl.includes('?') ? '&' : '?'
    window.location.href = `${passUrl}${sep}token=${encodeURIComponent(customerAccessToken)}`
    return
  }
  try {
    const res = await fetch('/api/pass/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerAccessToken}`,
      },
      body: JSON.stringify({ customerId, platform: 'apple' }),
    })
    if (res.ok) {
      const data = await res.json()
      const dl = data.downloadUrl ?? data.passUrl
      if (dl) {
        const url = dl.startsWith('http') ? dl : `${PASS_SERVICE}${dl}`
        const sep = url.includes('?') ? '&' : '?'
        window.location.href = `${url}${sep}token=${encodeURIComponent(customerAccessToken)}`
      }
    }
  } catch {
    // Non-critical
  }
}

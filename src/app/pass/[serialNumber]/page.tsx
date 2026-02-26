import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PassWallet } from './_components/pass-wallet'

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export default async function PassPage({ params }: { params: Promise<{ serialNumber: string }> }) {
  const { serialNumber } = await params
  const appleDownloadUrl = `${PASS_SERVICE_URL}/api/passes/${serialNumber}/download`

  const headersList = await headers()
  const userAgent = headersList.get('user-agent') || ''
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const isAndroid = /Android/i.test(userAgent)

  // iOS: hand off directly to Apple Wallet
  if (isIOS) {
    redirect(appleDownloadUrl)
  }

  // Fetch Google save URL (used for Android redirect and desktop QR)
  let googleSaveUrl: string | null = null
  try {
    const res = await fetch(`${PASS_SERVICE_URL}/api/google/save-url/${serialNumber}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      googleSaveUrl = data.saveUrl ?? null
    }
  } catch {
    // Google Wallet not configured — degrade gracefully
  }

  // Android: deep-link into Google Wallet app
  if (isAndroid && googleSaveUrl) {
    redirect(googleSaveUrl)
  }

  // Desktop: show QR codes for both platforms
  return <PassWallet appleDownloadUrl={appleDownloadUrl} googleSaveUrl={googleSaveUrl} />
}

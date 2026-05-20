import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PassWallet } from './_components/pass-wallet'
import { createCustomerAccessToken } from '@/lib/customer-access'
import { adminSupabase } from '@/lib/studio-access'

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export default async function PassPage({ params, searchParams }: { params: Promise<{ serialNumber: string }>; searchParams: Promise<{ token?: string }> }) {
  const { serialNumber } = await params
  const { token: providedToken } = await searchParams

  // Always look up the pass to find the owning studio's language — this page
  // renders studio-localised UI, so we need the language even when a token was
  // already provided in the URL.
  const { data: pass } = await adminSupabase
    .from('wallet_passes')
    .select('customer_id, customers:customer_id(studios:studio_id(settings))')
    .eq('serial_number', serialNumber)
    .single()

  if (!pass) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Pass not found.</div>
  }

  const customer = pass.customers as unknown as { studios: { settings: Record<string, unknown> | null } | null } | null
  const studioLanguage = (customer?.studios?.settings?.language as string) ?? 'en'

  const token = providedToken ?? createCustomerAccessToken(pass.customer_id, 5 * 60)

  const appleDownloadUrl = `${PASS_SERVICE_URL}/api/passes/${serialNumber}/download?token=${encodeURIComponent(token)}`

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
  return <PassWallet appleDownloadUrl={appleDownloadUrl} googleSaveUrl={googleSaveUrl} language={studioLanguage} />
}

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PassWallet } from './_components/pass-wallet'
import { createClient } from '@/lib/supabase/server'
import { createCustomerAccessToken } from '@/lib/customer-access'

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export default async function PassPage({ params, searchParams }: { params: Promise<{ serialNumber: string }>; searchParams: Promise<{ token?: string }> }) {
  const { serialNumber } = await params
  const { token: providedToken } = await searchParams

  // Use provided token or generate a short-lived one by looking up the pass owner
  let token = providedToken
  if (!token) {
    const supabase = await createClient()
    const { data: pass } = await supabase
      .from('wallet_passes')
      .select('customer_id')
      .eq('serial_number', serialNumber)
      .single()

    if (!pass) {
      return <div style={{ padding: '2rem', textAlign: 'center' }}>Pass not found.</div>
    }

    token = createCustomerAccessToken(pass.customer_id, 5 * 60)
  }

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
  return <PassWallet appleDownloadUrl={appleDownloadUrl} googleSaveUrl={googleSaveUrl} />
}

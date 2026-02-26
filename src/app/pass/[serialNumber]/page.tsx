import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PassQR } from './_components/pass-qr'

const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

export default async function PassPage({ params }: { params: Promise<{ serialNumber: string }> }) {
  const { serialNumber } = await params
  const downloadUrl = `${PASS_SERVICE_URL}/api/passes/${serialNumber}/download`

  const headersList = await headers()
  const userAgent = headersList.get('user-agent') || ''
  const isIOS = /iPhone|iPad|iPod/.test(userAgent)

  if (isIOS) {
    redirect(downloadUrl)
  }

  return <PassQR downloadUrl={downloadUrl} />
}

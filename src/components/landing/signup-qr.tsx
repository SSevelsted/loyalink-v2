'use client'

import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  url: string
  studioName?: string
  size?: number
  className?: string
}

const DOWNLOAD_QR_SIZE = 800

export function SignupQR({ url, studioName, size = 160, className }: Props) {
  const hiResRef = useRef<HTMLCanvasElement>(null)

  const handleDownload = () => {
    const qrCanvas = hiResRef.current
    if (!qrCanvas) return

    const padding = 64
    const labelHeight = 80
    const qrSize = DOWNLOAD_QR_SIZE

    const totalW = qrSize + padding * 2
    const totalH = qrSize + padding * 2 + labelHeight

    const out = document.createElement('canvas')
    out.width = totalW
    out.height = totalH
    const ctx = out.getContext('2d')!

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, totalW, totalH)

    // QR code — drawn 1:1 from the hi-res canvas, no scaling
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize)

    // Studio name
    if (studioName) {
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.textAlign = 'center'
      ctx.fillText(studioName, totalW / 2, qrSize + padding + 36)
    }

    // Short URL
    ctx.font = '18px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'center'
    ctx.fillText(url.replace(/^https?:\/\//, ''), totalW / 2, qrSize + padding + (studioName ? 64 : 36))

    const link = document.createElement('a')
    link.download = `${(studioName ?? 'loyalty').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`
    link.href = out.toDataURL('image/png')
    link.click()
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="rounded-xl overflow-hidden bg-white p-2.5 border border-border/40 shadow-sm">
        <QRCodeCanvas
          value={url}
          size={size * 2}
          level="M"
          bgColor="#ffffff"
          fgColor="#111827"
          style={{ width: size, height: size, imageRendering: 'pixelated' }}
        />
      </div>
      {/* Hidden hi-res canvas for crisp downloads */}
      <div className="hidden">
        <QRCodeCanvas
          ref={hiResRef}
          value={url}
          size={DOWNLOAD_QR_SIZE}
          level="M"
          bgColor="#ffffff"
          fgColor="#111827"
        />
      </div>
      <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={handleDownload}>
        <Download className="h-3.5 w-3.5" />
        Download PNG
      </Button>
    </div>
  )
}

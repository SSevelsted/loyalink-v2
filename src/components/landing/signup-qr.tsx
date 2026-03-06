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

export function SignupQR({ url, studioName, size = 160, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleDownload = () => {
    const qrCanvas = canvasRef.current
    if (!qrCanvas) return

    const padding = 32
    const labelHeight = 64
    const qrSize = 400 // high-res for printing
    const scale = qrSize / size

    const totalW = qrSize + padding * 2
    const totalH = qrSize + padding * 2 + labelHeight

    const out = document.createElement('canvas')
    out.width = totalW
    out.height = totalH
    const ctx = out.getContext('2d')!

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, totalW, totalH)

    // QR code — scale up from rendered canvas
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize)

    // Studio name
    if (studioName) {
      ctx.font = `bold ${Math.round(14 * scale * 0.06)}px system-ui, -apple-system, sans-serif`
      ctx.fillStyle = '#111827'
      ctx.textAlign = 'center'
      ctx.fillText(studioName, totalW / 2, qrSize + padding + 26)
    }

    // Short URL
    ctx.font = `${Math.round(11 * scale * 0.06)}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'center'
    ctx.fillText(url.replace(/^https?:\/\//, ''), totalW / 2, qrSize + padding + (studioName ? 48 : 30))

    const link = document.createElement('a')
    link.download = `${(studioName ?? 'loyalty').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`
    link.href = out.toDataURL('image/png')
    link.click()
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="rounded-xl overflow-hidden bg-white p-2.5 border border-border/40 shadow-sm">
        <QRCodeCanvas
          ref={canvasRef}
          value={url}
          size={size}
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

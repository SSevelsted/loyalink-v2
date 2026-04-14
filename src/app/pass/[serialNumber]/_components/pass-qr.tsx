'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Smartphone } from 'lucide-react'

export function PassQR({ downloadUrl }: { downloadUrl: string }) {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full text-center">
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Add to Apple Wallet</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Scan this QR code with your iPhone camera to add your loyalty card to Apple Wallet
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-lg">
          <QRCodeSVG value={downloadUrl} size={220} level="M" />
        </div>

        <p className="text-xs text-muted-foreground">
          Open your iPhone Camera app and point it at the QR code
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { QrScanner } from '@/components/scanner/qr-scanner'
import { X, Keyboard } from 'lucide-react'

export function ScanDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [scanResult, setScanResult] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const lookupCustomer = async (value: string) => {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .or(`id.eq.${value},member_id.eq.${value},phone.eq.${value}`)
      .limit(1)
      .single()

    if (data) {
      onOpenChange(false)
      setScanResult(null)
      setManualInput('')
      setManualMode(false)
      router.push(`/customers/${data.id}`)
    } else {
      setScanResult(`No customer found for "${value}"`)
    }
  }

  const handleScan = useCallback((result: string) => {
    setScanResult(result)
    lookupCustomer(result)
  }, [lookupCustomer])

  const handleManualLookup = () => {
    if (manualInput.trim()) {
      lookupCustomer(manualInput.trim())
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setScanResult(null)
    setManualInput('')
    setManualMode(false)
  }

  useEffect(() => {
    if (manualMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [manualMode])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Fullscreen camera */}
      <div className="absolute inset-0">
        <QrScanner onScan={handleScan} active={open} fullscreen />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-95 transition-transform"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Instruction text */}
      <div className="absolute top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] left-0 right-0 z-10 text-center">
        <p className="text-sm font-medium text-white/80">Place the QR code inside the frame</p>
      </div>

      {/* Center bracket overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative h-52 w-52">
          <div className="absolute top-0 left-0 h-10 w-10 border-t-[3px] border-l-[3px] border-white rounded-tl-xl" />
          <div className="absolute top-0 right-0 h-10 w-10 border-t-[3px] border-r-[3px] border-white rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 h-10 w-10 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 h-10 w-10 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />
        </div>
      </div>

      {/* Error toast */}
      {scanResult && (
        <div className="absolute top-[max(7rem,calc(env(safe-area-inset-top)+6rem))] left-4 right-4 z-10">
          <div className="mx-auto max-w-sm rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-500/30 px-4 py-2.5 text-center">
            <p className="text-sm text-red-300">{scanResult}</p>
          </div>
        </div>
      )}

      {/* Bottom area */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-[max(2rem,env(safe-area-inset-bottom))] px-6">
        {manualMode ? (
          <div className="mx-auto max-w-sm animate-slide-up">
            <div className="flex gap-2 rounded-2xl bg-black/60 backdrop-blur-xl p-2">
              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualLookup()
                  if (e.key === 'Escape') { setManualMode(false); setManualInput('') }
                }}
                placeholder="Member ID or phone..."
                className="flex-1 h-12 rounded-xl bg-white/10 border border-white/10 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/25"
              />
              <Button
                onClick={handleManualLookup}
                disabled={!manualInput.trim()}
                className="h-12 rounded-xl px-5"
              >
                Look up
              </Button>
            </div>
            <button
              onClick={() => { setManualMode(false); setManualInput('') }}
              className="mx-auto mt-3 block text-xs text-white/50 active:text-white/70"
            >
              Back to camera
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setManualMode(true)}
              className="flex items-center gap-2.5 rounded-full bg-white/90 px-5 py-3 text-sm font-medium text-black active:scale-95 transition-transform shadow-lg"
            >
              <Keyboard className="h-4 w-4" />
              Enter manually
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { QrScanner } from '@/components/scanner/qr-scanner'
import { QRCodeSVG } from 'qrcode.react'
import { X, Keyboard, Camera, Smartphone } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

type Mode = 'camera' | 'phone'

export function ScanDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [mode, setMode] = useState<Mode>('camera')
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isLookingUpRef = useRef(false)
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Default to phone QR mode on desktop (no rear camera available)
  useEffect(() => {
    if (open) {
      const isDesktop = window.innerWidth >= 1024 && !('ontouchstart' in window)
      setMode(isDesktop ? 'phone' : 'camera')
      setManualMode(false)
      setScanError(null)
      setManualInput('')
      setIsLookingUp(false)
      isLookingUpRef.current = false
    }
  }, [open])

  const lookupCustomer = async (value: string) => {
    const raw = value.trim()
    const stripped = raw.replace(/\s+/g, '')
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)

    const conditions: string[] = []
    if (isUuid) conditions.push(`id.eq.${raw}`)
    conditions.push(`member_id.eq.${raw}`, `phone.eq.${raw}`)
    if (stripped !== raw) {
      conditions.push(`member_id.eq.${stripped}`, `phone.eq.${stripped}`)
    }

    // Fetch full customer so we can pre-populate the React Query cache —
    // the transaction page will find it already there and render immediately.
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(conditions.join(','))
      .limit(1)
      .single()

    if (data) {
      // Seed the cache so useCustomer() on the transaction page is instant
      queryClient.setQueryData(['customer', data.id], data)
      onOpenChange(false)
      router.push(`/customers/${data.id}/transaction`)
      // No router.refresh() — it invalidates the cache and adds an extra round-trip
    } else {
      setIsLookingUp(false)
      isLookingUpRef.current = false
      setScanError(`No customer found for "${value}"`)
    }
  }

  const handleScan = useCallback((result: string) => {
    if (isLookingUpRef.current) return
    isLookingUpRef.current = true
    setIsLookingUp(true)
    setScanError(null)
    lookupCustomer(result)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleManualLookup = () => {
    if (!manualInput.trim() || isLookingUpRef.current) return
    isLookingUpRef.current = true
    setIsLookingUp(true)
    setScanError(null)
    lookupCustomer(manualInput.trim())
  }

  const handleClose = () => {
    onOpenChange(false)
    setScanError(null)
    setManualInput('')
    setManualMode(false)
    setIsLookingUp(false)
    isLookingUpRef.current = false
  }

  useEffect(() => {
    if (manualMode && inputRef.current) inputRef.current.focus()
  }, [manualMode])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const scanUrl = `${APP_URL}/scan`

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black">

      {/* ── Phone QR mode ── */}
      {mode === 'phone' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-white">Scan on your phone</p>
            <p className="text-sm text-white/50">Open the scanner on your mobile device</p>
          </div>

          {/* QR code */}
          <div className="rounded-2xl bg-white p-5 shadow-2xl">
            <QRCodeSVG
              value={scanUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          <p className="text-xs text-white/30 font-mono">{scanUrl}</p>

          <button
            onClick={() => setMode('camera')}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Use camera instead
          </button>
        </div>
      )}

      {/* ── Camera mode ── */}
      {mode === 'camera' && (
        <>
          <div className="absolute inset-0">
            <QrScanner onScan={handleScan} active={open && mode === 'camera'} fullscreen />
          </div>

          {/* Loading overlay — immediate feedback after QR detected */}
          {isLookingUp && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
              <p className="text-sm font-medium text-white">Looking up customer...</p>
            </div>
          )}

          {/* Instruction */}
          {!isLookingUp && (
            <div className="absolute top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] left-0 right-0 z-10 text-center">
              <p className="text-sm font-medium text-white/80">Place the QR code inside the frame</p>
            </div>
          )}

          {/* Bracket overlay */}
          {!isLookingUp && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="relative h-52 w-52">
                <div className="absolute top-0 left-0 h-10 w-10 border-t-[3px] border-l-[3px] border-white rounded-tl-xl" />
                <div className="absolute top-0 right-0 h-10 w-10 border-t-[3px] border-r-[3px] border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 h-10 w-10 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 h-10 w-10 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />
              </div>
            </div>
          )}

          {/* Error toast */}
          {scanError && !isLookingUp && (
            <div className="absolute top-[max(7rem,calc(env(safe-area-inset-top)+6rem))] left-4 right-4 z-10">
              <div className="mx-auto max-w-sm rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-500/30 px-4 py-2.5 text-center">
                <p className="text-sm text-red-300">{scanError}</p>
              </div>
            </div>
          )}

          {/* Bottom area */}
          {!isLookingUp && (
            <div className="absolute bottom-0 left-0 right-0 z-10 pb-[max(2rem,env(safe-area-inset-bottom))] px-6">
              {manualMode ? (
                <div className="mx-auto max-w-sm animate-slide-up">
                  <div className="flex gap-2 rounded-2xl bg-black/60 backdrop-blur-xl p-2">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="tel"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleManualLookup()
                        if (e.key === 'Escape') { setManualMode(false); setManualInput('') }
                      }}
                      placeholder="Member ID or phone..."
                      className="flex-1 h-12 rounded-xl bg-white/10 border border-white/10 px-4 text-base text-white placeholder:text-white/40 focus:outline-none focus:border-white/25"
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
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setManualMode(true)}
                    className="flex items-center gap-2.5 rounded-full bg-white/90 px-5 py-3.5 text-sm font-medium text-black active:scale-95 transition-transform shadow-lg"
                  >
                    <Keyboard className="h-4 w-4" />
                    Enter manually
                  </button>
                  <button
                    onClick={() => setMode('phone')}
                    className="flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-sm px-5 py-3.5 text-sm font-medium text-white active:scale-95 transition-transform"
                  >
                    <Smartphone className="h-4 w-4" />
                    Use phone
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Close button — always visible */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={handleClose}
          aria-label="Close scanner"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-95 transition-transform"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Mode toggle pill */}
        {!isLookingUp && (
          <div className="flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm p-1">
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                mode === 'camera' ? 'bg-white text-black' : 'text-white/60 active:text-white'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Camera
            </button>
            <button
              onClick={() => setMode('phone')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                mode === 'phone' ? 'bg-white text-black' : 'text-white/60 active:text-white'
              }`}
            >
              <Smartphone className="h-3 w-3" />
              Phone
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

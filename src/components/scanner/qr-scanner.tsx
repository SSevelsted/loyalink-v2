'use client'

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface QrScannerProps {
  onScan: (result: string) => void
  active: boolean
  fullscreen?: boolean
}

export function QrScanner({ onScan, active, fullscreen }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!active) {
      stop()
      return
    }
    start()
    return () => { stop() }
  }, [active])

  async function start() {
    setError(null)
    setReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setError(null)
        setReady(true)
        scan()
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // play() was interrupted (e.g. by React Strict Mode remount) – ignore
        return
      }
      setError('Camera access denied. Allow camera in browser settings.')
    }
  }

  function stop() {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setReady(false)
  }

  function scan() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scan)
      return
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (code?.data) {
      onScan(code.data)
    }
    rafRef.current = requestAnimationFrame(scan)
  }

  return (
    <div className={fullscreen ? "absolute inset-0 bg-black" : "relative w-full aspect-square overflow-hidden rounded-2xl bg-black"}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Corner bracket overlay — only in non-fullscreen (fullscreen parent draws its own) */}
      {!fullscreen && ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[55%] w-[55%]">
            <div className="absolute top-0 left-0 h-7 w-7 border-t-2 border-l-2 border-primary rounded-tl-md" />
            <div className="absolute top-0 right-0 h-7 w-7 border-t-2 border-r-2 border-primary rounded-tr-md" />
            <div className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-primary rounded-bl-md" />
            <div className="absolute bottom-0 right-0 h-7 w-7 border-b-2 border-r-2 border-primary rounded-br-md" />
            <div className="absolute left-3 right-3 top-1/2 h-px bg-primary/50 animate-pulse" />
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

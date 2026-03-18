'use client'

import { useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { Upload, X, Crop, Wand2, Minus, Plus, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

type ImageUploadProps = {
  label: string
  hint?: string
  currentUrl: string | null
  placeholderUrl?: string
  onUpload: (file: File) => void
  onRemove?: () => void
  uploading?: boolean
  accept?: string
  aspect?: number
  targetWidth?: number
  targetHeight?: number
  className?: string
  removeBgType?: 'auto' | 'graphic'
}

function resizeImage(
  imageSrc: string,
  width: number,
  height: number,
  fileName: string
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        resolve(new File([blob!], fileName, { type: 'image/png' }))
      }, 'image/png')
    }
    img.src = imageSrc
  })
}

async function getCroppedFile(
  imageSrc: string,
  crop: Area,
  fileName: string
): Promise<File> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve) => {
    image.onload = () => resolve()
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')!

  // Handle crops that extend beyond image bounds (restrictPosition=false).
  // Only draw the overlapping portion; rest stays transparent.
  const sx = Math.max(0, crop.x)
  const sy = Math.max(0, crop.y)
  const sx2 = Math.min(image.naturalWidth, crop.x + crop.width)
  const sy2 = Math.min(image.naturalHeight, crop.y + crop.height)
  const sw = sx2 - sx
  const sh = sy2 - sy
  const dx = sx - crop.x
  const dy = sy - crop.y

  if (sw > 0 && sh > 0) {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, sw, sh)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], fileName, { type: 'image/png' }))
    }, 'image/png')
  })
}

export type ImageUploadHandle = {
  trigger: () => void
}

export const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(function ImageUpload({
  label,
  hint,
  currentUrl,
  placeholderUrl,
  onUpload,
  onRemove,
  uploading,
  accept = 'image/png,image/jpeg,image/webp',
  aspect,
  targetWidth,
  targetHeight,
  className,
  removeBgType,
}: ImageUploadProps, ref) {
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    trigger: () => inputRef.current?.click(),
  }))
  const [cropOpen, setCropOpen] = useState(false)
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_croppedArea, setCroppedArea] = useState<Area | null>(null)
  const croppedAreaRef = useRef<Area | null>(null)
  const [computedMinZoom, setComputedMinZoom] = useState(0.5)
  const [initialFitZoom, setInitialFitZoom] = useState(1)
  const [removingBg, setRemovingBg] = useState(false)
  const [applying, setApplying] = useState(false)

  const removeBackground = async (imageSource: string | Blob): Promise<Blob> => {
    let imageBlob: Blob
    if (typeof imageSource === 'string') {
      const imageRes = await fetch(imageSource)
      if (!imageRes.ok) throw new Error('Failed to fetch image')
      imageBlob = await imageRes.blob()
    } else {
      imageBlob = imageSource
    }

    const formData = new FormData()
    formData.append('image', imageBlob, 'image.png')

    const res = await fetch('/api/remove-bg', { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Background removal failed' }))
      throw new Error(data.error ?? 'Background removal failed')
    }
    return await res.blob()
  }

  const handleRemoveBg = async () => {
    if (!currentUrl) return
    setRemovingBg(true)
    try {
      const resultBlob = await removeBackground(currentUrl)
      const file = new File([resultBlob], 'bg-removed.png', { type: 'image/png' })
      onUpload(file)
      toast.success('Background removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Background removal failed')
    } finally {
      setRemovingBg(false)
    }
  }

  const handleRemoveBgInCrop = async () => {
    if (!rawImage) return
    setRemovingBg(true)
    try {
      const resultBlob = await removeBackground(rawImage)
      const url = URL.createObjectURL(resultBlob)
      URL.revokeObjectURL(rawImage)
      setRawImage(url)
      toast.success('Background removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Background removal failed')
    } finally {
      setRemovingBg(false)
    }
  }

  const onFileSelected = (file: File) => {
    if (!aspect) {
      onUpload(file)
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      const imageAspect = img.width / img.height
      const tolerance = 0.05
      // If aspect ratio already matches, just resize directly
      if (Math.abs(imageAspect - aspect) < tolerance && targetWidth && targetHeight) {
        const resized = await resizeImage(url, targetWidth, targetHeight, file.name)
        URL.revokeObjectURL(url)
        onUpload(resized)
      } else {
        setRawImage(url)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setCroppedArea(null)
        croppedAreaRef.current = null
        setComputedMinZoom(0.5)
        setInitialFitZoom(1)
        setCropOpen(true)
      }
    }
    img.src = url
  }

  const handleCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    croppedAreaRef.current = croppedAreaPixels
    setCroppedArea(croppedAreaPixels)
  }, [])

  const handleCropConfirm = async () => {
    const area = croppedAreaRef.current
    if (!rawImage || !area) return
    setApplying(true)
    try {
      let file = await getCroppedFile(rawImage, area, 'cropped.png')
      if (targetWidth && targetHeight) {
        const url = URL.createObjectURL(file)
        file = await resizeImage(url, targetWidth, targetHeight, 'cropped.png')
        URL.revokeObjectURL(url)
      }
      URL.revokeObjectURL(rawImage)
      setRawImage(null)
      setCropOpen(false)
      onUpload(file)
      toast.success('Image cropped')
    } finally {
      setApplying(false)
    }
  }

  const handleMediaLoaded = useCallback((mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
    if (!aspect) return
    const imageAspect = mediaSize.naturalWidth / mediaSize.naturalHeight
    let fitZoom: number
    if (imageAspect > aspect) {
      fitZoom = 1
    } else {
      fitZoom = imageAspect / aspect
    }
    // Allow zooming out well beyond fit so logos can float with padding
    const minZ = Math.max(0.05, fitZoom * 0.4)
    setComputedMinZoom(minZ)
    setInitialFitZoom(Math.max(fitZoom, minZ))
    setZoom(Math.max(fitZoom, minZ))
  }, [aspect])

  const handleFitToCenter = () => {
    setZoom(initialFitZoom)
    setCrop({ x: 0, y: 0 })
  }

  const nudgeZoom = (delta: number) => {
    setZoom((z) => Math.min(3, Math.max(computedMinZoom, z + delta)))
  }

  const handleCropCancel = () => {
    if (rawImage) URL.revokeObjectURL(rawImage)
    setRawImage(null)
    setCropOpen(false)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) onFileSelected(file)
    },
    [aspect, onUpload]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
        {label}
      </label>
      {hint && (
        <span className="text-[10px] text-muted-foreground block mb-2">
          {hint}
        </span>
      )}
      {currentUrl ? (
        <div className="relative group rounded-xl border border-border/30 overflow-hidden bg-secondary/30">
          <img
            src={currentUrl}
            alt={label}
            className="w-full h-24 object-contain p-2"
          />
          {removingBg ? (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-white font-medium">Removing background...</span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-1.5 p-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button size="sm" variant="secondary" onClick={handleRemoveBg} className="gap-1">
                <Wand2 className="h-3 w-3" />
                Remove BG
              </Button>
              {onRemove && (
                <Button size="sm" variant="destructive" onClick={onRemove}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      ) : placeholderUrl ? (
        <div
          className="relative group rounded-xl border border-border/30 overflow-hidden bg-secondary/30 cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <img
            src={placeholderUrl}
            alt={label}
            className="w-full h-24 object-contain p-2 opacity-60"
          />
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[9px] font-medium uppercase tracking-wider bg-secondary/80 text-muted-foreground px-1.5 py-0.5 rounded">
              Default
            </span>
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" variant="secondary">
              Customize
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 transition-colors cursor-pointer bg-secondary/20"
        >
          {uploading ? (
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">
                Drop or click
              </span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {/* Crop dialog */}
      <Dialog open={cropOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-4 w-4" />
              Crop Image
            </DialogTitle>
            {targetWidth && targetHeight && (
              <p className="text-xs text-muted-foreground">
                Position and scale your image within the {targetWidth}&times;{targetHeight} area
              </p>
            )}
          </DialogHeader>
          <div
            className="relative h-96 rounded-xl overflow-hidden"
            onDoubleClick={handleFitToCenter}
            style={{
              backgroundImage:
                'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              backgroundColor: '#666',
            }}
          >
            {rawImage && (
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                minZoom={computedMinZoom}
                maxZoom={3}
                aspect={aspect}
                objectFit="contain"
                restrictPosition={false}
                showGrid={false}
                zoomSpeed={0.5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                onMediaLoaded={handleMediaLoaded}
                style={{
                  containerStyle: { background: 'transparent' },
                  cropAreaStyle: {
                    border: '2px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  },
                }}
              />
            )}

            {/* Center crosshair */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-5 h-px bg-white/20" />
              <div className="absolute h-5 w-px bg-white/20" />
            </div>

            {/* Dimensions badge */}
            {targetWidth && targetHeight && (
              <div className="absolute bottom-2 right-2 z-10 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white font-mono pointer-events-none">
                {targetWidth}&times;{targetHeight}
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nudgeZoom(-0.1)}
              className="h-7 w-7 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <Minus className="h-3 w-3 text-muted-foreground" />
            </button>
            <input
              type="range"
              min={computedMinZoom}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 appearance-none rounded-full bg-secondary cursor-pointer accent-primary"
            />
            <button
              type="button"
              onClick={() => nudgeZoom(0.1)}
              className="h-7 w-7 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
            </button>
            <span className="text-[11px] text-muted-foreground font-mono w-10 text-center tabular-nums">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleFitToCenter}
              className="h-7 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center gap-1.5 px-2 transition-colors"
              title="Fit & center"
            >
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Fit</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Scroll to zoom. Double-click to fit.</p>
            <div className="flex gap-2">
              {removeBgType && (
                <Button variant="outline" size="sm" onClick={handleRemoveBgInCrop} disabled={removingBg} className="gap-1">
                  <Wand2 className="h-3 w-3" />
                  {removingBg ? 'Removing...' : 'Remove BG'}
                </Button>
              )}
              <Button variant="ghost" onClick={handleCropCancel}>
                Cancel
              </Button>
              <Button onClick={handleCropConfirm} disabled={applying}>
                {applying ? 'Applying...' : 'Apply Crop'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})

'use client'

import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { Upload, X, Crop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ImageUploadProps = {
  label: string
  hint?: string
  currentUrl: string | null
  onUpload: (file: File) => void
  onRemove?: () => void
  uploading?: boolean
  accept?: string
  aspect?: number
  targetWidth?: number
  targetHeight?: number
  className?: string
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
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], fileName, { type: 'image/png' }))
    }, 'image/png')
  })
}

export function ImageUpload({
  label,
  hint,
  currentUrl,
  onUpload,
  onRemove,
  uploading,
  accept = 'image/png,image/jpeg,image/webp',
  aspect,
  targetWidth,
  targetHeight,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

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
        setCropOpen(true)
      }
    }
    img.src = url
  }

  const handleCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  const handleCropConfirm = async () => {
    if (!rawImage || !croppedArea) return
    const file = await getCroppedFile(rawImage, croppedArea, 'cropped.png')
    URL.revokeObjectURL(rawImage)
    setRawImage(null)
    setCropOpen(false)
    onUpload(file)
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
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            {onRemove && (
              <Button size="sm" variant="destructive" onClick={onRemove}>
                <X className="h-3 w-3" />
              </Button>
            )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-4 w-4" />
              Crop Image
            </DialogTitle>
          </DialogHeader>
          <div
            className="relative h-72 rounded-xl overflow-hidden"
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
                minZoom={0.1}
                maxZoom={3}
                aspect={aspect}
                objectFit="contain"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                style={{
                  containerStyle: { background: 'transparent' },
                  cropAreaStyle: {
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  },
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground shrink-0">Zoom</label>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleCropCancel}>
              Cancel
            </Button>
            <Button onClick={handleCropConfirm}>
              Apply Crop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

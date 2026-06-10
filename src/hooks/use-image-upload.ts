'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { toast } from 'sonner'
import { useStudio } from './use-studio'

export function useImageUpload() {
  const { currentStudio } = useStudio()
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const upload = async (file: File, path: string): Promise<string | null> => {
    if (!currentStudio) {
      toast.error('No studio selected — refresh and try again')
      return null
    }
    setUploading(true)
    try {
      const filePath = `${currentStudio.id}/${path}`
      const { error } = await supabase.storage
        .from('studio-assets')
        .upload(filePath, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage
        .from('studio-assets')
        .getPublicUrl(filePath)
      // Cache-bust: same path returns same URL, so browser/React won't refresh
      return `${data.publicUrl}?t=${Date.now()}`
    } catch (err) {
      // Surface the real reason instead of silently reverting to an empty
      // upload box — a swallowed error here looks like "nothing happened".
      console.error('Upload failed:', err)
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast.error(`Couldn't upload image: ${message}`)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading }
}

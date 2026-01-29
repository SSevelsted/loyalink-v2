'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useStudio } from './use-studio'

export function useImageUpload() {
  const { currentStudio } = useStudio()
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const upload = async (file: File, path: string): Promise<string | null> => {
    if (!currentStudio) return null
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
      return data.publicUrl
    } catch (err) {
      console.error('Upload failed:', err)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading }
}

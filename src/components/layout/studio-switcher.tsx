'use client'

import { useStudio } from '@/hooks/use-studio'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

export function StudioSwitcher() {
  const { studios, currentStudio, setCurrentStudioId } = useStudio()

  if (studios.length <= 1) {
    return (
      <div className="flex items-center gap-2.5 px-1 py-1.5">
        <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground truncate">
          {currentStudio?.name ?? 'No studio'}
        </span>
      </div>
    )
  }

  return (
    <Select value={currentStudio?.id ?? ''} onValueChange={setCurrentStudioId}>
      <SelectTrigger className="w-full h-9 bg-secondary/50 border-border/50 text-sm">
        <SelectValue placeholder="Select studio" />
      </SelectTrigger>
      <SelectContent>
        {studios.map((studio) => (
          <SelectItem key={studio.id} value={studio.id}>
            {studio.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

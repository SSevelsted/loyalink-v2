'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useStudio } from '@/hooks/use-studio'
import { usePassTemplates } from '@/hooks/use-wallet'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select'
import { ChevronsUpDown, Shield, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function StudioSwitcher() {
  const { studios, currentStudio, setCurrentStudioId, isSuperAdmin, ownStudioIds } = useStudio()
  const { data: templates } = usePassTemplates()
  const [search, setSearch] = useState('')

  const studioLogo = templates?.[0]?.icon_url ?? templates?.[0]?.logo_url

  const showSearch = studios.length > 5

  const filteredStudios = useMemo(() => {
    if (!search) return studios
    const q = search.toLowerCase()
    return studios.filter((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q))
  }, [studios, search])

  const ownStudios = useMemo(
    () => filteredStudios.filter((s) => ownStudioIds.has(s.id)),
    [filteredStudios, ownStudioIds]
  )
  const otherStudios = useMemo(
    () => filteredStudios.filter((s) => !ownStudioIds.has(s.id)),
    [filteredStudios, ownStudioIds]
  )

  if (!isSuperAdmin && studios.length <= 1) return null

  return (
    <Select value={currentStudio?.id ?? ''} onValueChange={setCurrentStudioId}>
      <SelectTrigger className="w-full h-10 bg-secondary/50 border-border/50 text-sm px-2.5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {studioLogo ? (
            <Image
              src={studioLogo}
              alt={currentStudio?.name ?? 'Studio'}
              width={24}
              height={24}
              className="h-6 w-6 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-xs">
                {currentStudio?.name?.charAt(0) ?? 'S'}
              </span>
            </div>
          )}
          <span className="truncate">{currentStudio?.name ?? 'Select studio'}</span>
          {isSuperAdmin && currentStudio && !ownStudioIds.has(currentStudio.id) && (
            <Shield className="h-3 w-3 text-amber-400 shrink-0" />
          )}
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </SelectTrigger>
      <SelectContent>
        {showSearch && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search studios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {isSuperAdmin ? (
          <>
            {ownStudios.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">Your Studios</SelectLabel>
                {ownStudios.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {ownStudios.length > 0 && otherStudios.length > 0 && <SelectSeparator />}
            {otherStudios.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">All Studios</SelectLabel>
                {otherStudios.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    <div className="flex items-center gap-2">
                      {studio.name}
                      <Shield className="h-3 w-3 text-amber-400/60" />
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {filteredStudios.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">No studios found</div>
            )}
          </>
        ) : (
          filteredStudios.map((studio) => (
            <SelectItem key={studio.id} value={studio.id}>
              {studio.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStudios } from '@/hooks/use-admin'
import { useStudio } from '@/hooks/use-studio'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ChevronRight, Building2 } from 'lucide-react'
import { toast } from 'sonner'

type SortKey = 'newest' | 'oldest' | 'customers' | 'name'

export function StudiosSection() {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const { data: studios, isLoading } = useAdminStudios(search)
  const { setCurrentStudioId } = useStudio()
  const router = useRouter()

  const sorted = useMemo(() => {
    if (!studios) return []
    const list = [...studios]
    switch (sortKey) {
      case 'newest':
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'oldest':
        return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'customers':
        return list.sort((a, b) => (b.customers?.[0]?.count ?? 0) - (a.customers?.[0]?.count ?? 0))
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name))
      default:
        return list
    }
  }, [studios, sortKey])

  const handleSwitchToStudio = (studioId: string, studioName: string) => {
    setCurrentStudioId(studioId)
    router.push('/')
    toast.success(`Switched to ${studioName}`)
  }

  return (
    <div className="space-y-4">
      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50 border-border/50 h-12"
          />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-[170px] h-12 bg-card/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="customers">Most Customers</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {sorted.length} studio{sorted.length !== 1 ? 's' : ''}
      </p>

      {/* Studio list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : !sorted.length ? (
        <div className="py-20 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No studios found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((studio) => {
            const customerCount = studio.customers?.[0]?.count ?? 0
            const passCount = studio.wallet_passes?.[0]?.count ?? 0
            const memberCount = studio.studio_members?.[0]?.count ?? 0

            return (
              <button
                key={studio.id}
                onClick={() => handleSwitchToStudio(studio.id, studio.name)}
                className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-200 hover:bg-card hover:border-border/50 group min-h-[56px] w-full text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                    {studio.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{studio.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{studio.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                    {customerCount} customer{customerCount !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] hidden md:inline-flex">
                    {passCount} pass{passCount !== 1 ? 'es' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] hidden lg:inline-flex">
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(studio.created_at).toLocaleDateString()}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useStudio } from '@/hooks/use-studio'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

export default function EmbedCustomers() {
  const { currentStudio } = useStudio()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const studioId = currentStudio?.id
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['embed-customers', studioId, search],
    queryFn: async () => {
      const params = new URLSearchParams({ studioId: studioId!, token: token! })
      if (search) params.set('search', search)
      const res = await fetch(`/api/embed/customers?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!studioId && !!token,
  })

  const customers = data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Customers</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No customers found</p>
      ) : (
        <div className="space-y-2">
          {customers.map((c: Record<string, unknown>) => (
            <Card key={c.id as string} className="glass-card">
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{c.name as string}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(c.email as string) || (c.phone as string) || 'No contact info'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {c.loyalty_stage as string}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {Number(c.balance).toFixed(0)} kr
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

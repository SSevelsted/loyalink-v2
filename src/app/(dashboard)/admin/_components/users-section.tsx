'use client'

import { useState, useMemo } from 'react'
import { useAdminUsers } from '@/hooks/use-admin'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users } from 'lucide-react'

export function UsersSection() {
  const [search, setSearch] = useState('')
  const { data: users, isLoading } = useAdminUsers()

  const filtered = useMemo(() => {
    if (!users) return []
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter((u) => u.email.toLowerCase().includes(q))
  }, [users, search])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border/50 h-12"
        />
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} user{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* User list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-200 hover:bg-card hover:border-border/50 min-h-[56px]"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {user.studios.map((s) => (
                      <Badge
                        key={s.studio_id}
                        variant={s.role === 'super_admin' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {s.studio_name} ({s.role})
                      </Badge>
                    ))}
                    {user.studios.length === 0 && (
                      <span className="text-xs text-muted-foreground">No studio</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs text-muted-foreground">
                  {user.last_sign_in_at
                    ? `Last seen ${new Date(user.last_sign_in_at).toLocaleDateString()}`
                    : 'Never signed in'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

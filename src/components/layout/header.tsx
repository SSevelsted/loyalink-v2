'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, ChevronDown } from 'lucide-react'

export function UserNav() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-secondary outline-none">
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{user?.email}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

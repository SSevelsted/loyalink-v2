'use client'

import { useState } from 'react'
import { useStudio } from '@/hooks/use-studio'
import { BarChart3, Building2, Users, Activity, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'

import { OverviewSection } from './_components/overview-section'
import { StudiosSection } from './_components/studios-section'
import { UsersSection } from './_components/users-section'
import { ActivitySection } from './_components/activity-section'
import { SupportSection } from './_components/support-section'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'studios', label: 'Studios', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'support', label: 'Support', icon: LifeBuoy },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function AdminPage() {
  const { isSuperAdmin } = useStudio()
  const [activeSection, setActiveSection] = useState<SectionId>('overview')

  // Super admin is a global capability — don't gate on the current studio's
  // membership role (which is 'owner' on studios the super_admin also owns).
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Super Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform overview and management
        </p>
      </div>

      {/* Pill navigation */}
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {section.label}
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <div>
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'studios' && <StudiosSection />}
        {activeSection === 'users' && <UsersSection />}
        {activeSection === 'activity' && <ActivitySection />}
        {activeSection === 'support' && <SupportSection />}
      </div>
    </div>
  )
}

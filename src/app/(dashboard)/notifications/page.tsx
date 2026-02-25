'use client'

import { useState } from 'react'
import { Megaphone, Zap, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

import { CampaignsSection } from './_components/campaigns-section'
import { AutomationsSection } from './_components/automations-section'
import { PushLogsSection } from './_components/push-logs-section'

const SECTIONS = [
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'logs', label: 'Push Logs', icon: Send },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export default function NotificationsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('campaigns')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Push campaigns, automations, and delivery logs
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
        {activeSection === 'campaigns' && <CampaignsSection />}
        {activeSection === 'automations' && <AutomationsSection />}
        {activeSection === 'logs' && <PushLogsSection />}
      </div>
    </div>
  )
}

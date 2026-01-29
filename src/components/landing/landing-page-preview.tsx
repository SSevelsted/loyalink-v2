'use client'

import type { LandingPageSettings } from '@/hooks/use-landing-page'

type Props = {
  headline: string
  description: string
  settings: LandingPageSettings
}

export function LandingPagePreview({ headline, description, settings }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-border/30 shadow-lg"
      style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
    >
      <div className="px-6 py-8 space-y-6 max-w-[320px] mx-auto">
        {/* Logo */}
        {settings.logoUrl && (
          <div className="flex justify-center">
            <img
              src={settings.logoUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          </div>
        )}

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold leading-tight" style={{ color: settings.textColor }}>
            {headline || 'Your Headline'}
          </h3>
          {description && (
            <p className="text-xs opacity-70" style={{ color: settings.textColor }}>
              {description}
            </p>
          )}
        </div>

        {/* Form mockup */}
        <div className="space-y-2.5">
          <div className="h-8 rounded-md bg-white/10 border border-white/20" />
          {settings.showEmail && (
            <div className="h-8 rounded-md bg-white/10 border border-white/20" />
          )}
          {settings.showPhone && (
            <div className="h-8 rounded-md bg-white/10 border border-white/20" />
          )}
          <div
            className="h-8 rounded-md flex items-center justify-center text-xs font-medium"
            style={{ backgroundColor: settings.brandColor, color: '#FFFFFF' }}
          >
            {settings.buttonText || 'Join'}
          </div>
        </div>
      </div>
    </div>
  )
}

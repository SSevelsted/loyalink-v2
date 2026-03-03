import { Shield, Clock, Users, Smartphone } from 'lucide-react'

type Props = {
  signupCount: number
  brandColor: string
  textColor: string
}

export function TrustBar({ signupCount, brandColor, textColor }: Props) {
  const pills = [
    { icon: Shield, label: 'Free forever' },
    { icon: Clock, label: '30 seconds' },
    ...(signupCount >= 25 ? [{ icon: Users, label: `${signupCount}+ members` }] : []),
    { icon: Smartphone, label: 'No app needed' },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {pills.map((pill) => {
        const Icon = pill.icon
        return (
          <span
            key={pill.label}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
            style={{
              borderColor: `${brandColor}30`,
              backgroundColor: `${brandColor}08`,
              color: textColor,
            }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: brandColor }} />
            {pill.label}
          </span>
        )
      })}
    </div>
  )
}

import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getSignupTranslations } from '@/lib/i18n/signup'

export const alt = 'Join the loyalty program'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ slug: string }> }

// Darken/lighten a hex color by a percentage (-100..100).
function shade(hex: string, percent: number): string {
  const m = hex.replace('#', '').match(/.{1,2}/g)
  if (!m || m.length < 3) return hex
  const [r, g, b] = m.slice(0, 3).map((h) => parseInt(h, 16))
  const adjust = (c: number) => {
    const target = percent < 0 ? 0 : 255
    const t = Math.abs(percent) / 100
    return Math.round(c + (target - c) * t)
  }
  const toHex = (c: number) => adjust(c).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('studio_landing_pages')
    .select('headline, description, settings, hero_image_url, studio_id, studios(name, settings)')
    .eq('slug', slug)
    .single()

  const studio = page?.studios as unknown as { name: string; settings: Record<string, unknown> } | null
  const pageSettings = (page?.settings ?? {}) as {
    brandColor?: string
    backgroundColor?: string
    textColor?: string
    logoUrl?: string | null
    language?: string
  }
  const studioSettings = (studio?.settings ?? {}) as Record<string, unknown>

  const language = pageSettings.language ?? (studioSettings.language as string) ?? 'en'
  const t = getSignupTranslations(language)

  // Resolve logo: settings override → hero image → pass template icon
  let logoUrl: string | null = pageSettings.logoUrl ?? page?.hero_image_url ?? null
  if (!logoUrl && page?.studio_id) {
    const { data: template } = await supabase
      .from('pass_templates')
      .select('icon_url, logo_url')
      .eq('studio_id', page.studio_id)
      .limit(1)
      .single()
    logoUrl = template?.icon_url ?? template?.logo_url ?? null
  }

  const brandColor = pageSettings.brandColor || '#6366f1'
  const headline = page?.headline ?? studio?.name ?? t.fallbackJoinTitle
  const description = page?.description ?? null

  // Build a dark, brand-tinted background so it reads well in iMessage / Slack.
  const bgBase = '#0b0b10'
  const accent = brandColor
  const accentSoft = shade(brandColor, -25)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '96px',
          backgroundColor: bgBase,
          backgroundImage: `radial-gradient(circle at 20% 15%, ${accent}55, transparent 55%), radial-gradient(circle at 85% 90%, ${accentSoft}55, transparent 55%)`,
          color: '#fafafa',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={200}
            height={200}
            style={{
              width: 200,
              height: 200,
              borderRadius: 9999,
              objectFit: 'cover',
              marginBottom: 48,
              border: `4px solid ${accent}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 9999,
              backgroundColor: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 96,
              fontWeight: 700,
              color: '#fff',
              marginBottom: 48,
            }}
          >
            {(studio?.name ?? 'L').charAt(0).toUpperCase()}
          </div>
        )}

        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            maxWidth: 1000,
            marginBottom: description ? 24 : 0,
          }}
        >
          {headline}
        </div>

        {description && (
          <div
            style={{
              fontSize: 32,
              color: '#a1a1aa',
              lineHeight: 1.35,
              maxWidth: 960,
            }}
          >
            {description}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 48,
            fontSize: 22,
            color: accent,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          loyalink.ai
        </div>
      </div>
    ),
    { ...size }
  )
}

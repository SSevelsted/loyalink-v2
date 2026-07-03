import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const alt = 'Your loyalty card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ memberId: string }> }

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
  const { memberId } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Resolve the member (by nanoid member_id, falling back to UUID) and studio.
  type CustomerRow = {
    name: string
    studio_id: string
    studios: { name: string; settings: Record<string, unknown> } | null
  }
  const select = 'name, studio_id, studios:studio_id(name, settings)'
  const byMemberId = (
    await supabase.from('customers').select(select).eq('member_id', memberId).single()
  ).data as CustomerRow | null
  const customer: CustomerRow | null =
    byMemberId ??
    ((await supabase.from('customers').select(select).eq('id', memberId).single()).data as CustomerRow | null)

  const studio = customer?.studios ?? null
  const studioName = studio?.name ?? 'Loyalink'
  const studioSettings = (studio?.settings ?? {}) as Record<string, unknown>

  // Resolve branding: landing page settings → hero image → pass template icon.
  const { data: landingPage } = customer
    ? await supabase
        .from('studio_landing_pages')
        .select('settings, hero_image_url')
        .eq('studio_id', customer.studio_id)
        .limit(1)
        .single()
    : { data: null }

  const branding = (landingPage?.settings ?? {}) as { brandColor?: string; logoUrl?: string | null }
  let logoUrl: string | null = branding.logoUrl ?? landingPage?.hero_image_url ?? null
  if (!logoUrl && customer) {
    const { data: template } = await supabase
      .from('pass_templates')
      .select('icon_url, logo_url')
      .eq('studio_id', customer.studio_id)
      .limit(1)
      .single()
    logoUrl = template?.icon_url ?? template?.logo_url ?? null
  }

  const brandColor = branding.brandColor || (studioSettings.brandColor as string) || '#6366f1'

  // Dark, brand-tinted background so it reads well in iMessage / WhatsApp / Slack.
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
            {studioName.charAt(0).toUpperCase()}
          </div>
        )}

        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            maxWidth: 1000,
            marginBottom: 24,
          }}
        >
          {studioName}
        </div>

        <div
          style={{
            fontSize: 34,
            color: '#a1a1aa',
            lineHeight: 1.35,
            maxWidth: 960,
          }}
        >
          Add your loyalty card to Apple &amp; Google Wallet
        </div>

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

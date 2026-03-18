import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { migrateRewardsConfig } from '@/types/database'
import { MARKETING_URL } from '@/lib/constants'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_TURNS = 4 // 1 initial + 3 refinements
const OPENROUTER_MODEL = 'google/gemini-3-pro-preview'

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '124, 58, 237'
}

type StoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

type BrandContext = {
  studioName: string
  signupUrl: string
  brandColor: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  currency: string
  tiers: { name: string; cashbackRate: number; isBase: boolean }[]
  referralEnabled: boolean
  referralBonusPerRef: number
  referralCap: number
  friendCashbackRate: number
  friendWelcomeBonus: number
  benefits: string[]
}

function buildSystemPrompt(b: BrandContext) {
  const baseTier = b.tiers[0]
  const topTier = b.tiers[b.tiers.length - 1]

  const tierLines = b.tiers
    .map((t) => `  - ${t.name}: ${t.cashbackRate}% cashback${t.isBase ? ' ← every new member starts here' : ''}`)
    .join('\n')

  const benefitLines = b.benefits.length
    ? b.benefits.map((b) => `  - ${b}`).join('\n')
    : ''

  const referralSection = b.referralEnabled
    ? `- Referral program:
  - Referred friends start at ${b.friendCashbackRate}% cashback${b.friendWelcomeBonus > 0 ? ` + ${b.friendWelcomeBonus} ${b.currency} instant welcome bonus` : ''}
  - Referrers earn up to ${b.referralCap}% cashback by referring friends (${b.referralBonusPerRef}% per referral)`
    : '- No referral program'

  return `You are a world-class social media designer and direct-response copywriter who specialises in creating Instagram Stories that drive real signups for local business loyalty programs. You combine premium visual design with proven conversion psychology.

## STUDIO BRAND
- Name: ${b.studioName}
- Signup URL (must appear visibly in every story): ${b.signupUrl}
- Primary / CTA color: ${b.brandColor}
- Background color: ${b.backgroundColor}
- Text color: ${b.textColor}
${b.logoUrl ? `- Logo URL: ${b.logoUrl} (include with crossorigin="anonymous")` : '- No logo — use bold styled text for the studio name'}

## LOYALTY PROGRAM
- Currency: ${b.currency}
- Base cashback: ${baseTier.cashbackRate}% from day one
- Maximum cashback: ${topTier.cashbackRate}% (${topTier.name})
- Tiers (ordered — index 0 is where every new member starts):
${tierLines}
${referralSection}

## KEY SELLING POINTS — use these, they drive signups
${benefitLines}
  - No app needed — works directly with Apple Wallet and Google Wallet
  - Free to join, takes 30 seconds
  - Cashback added automatically every visit — no friction, no scanning

## HTML STORY SPECIFICATION
- Self-contained HTML document, exactly 1080 × 1920 px
- <body>: exactly 1080px wide, 1920px tall — position:relative, overflow:hidden, margin:0, padding:0
- Inline CSS only. Load Google Fonts via <link> in <head>
- Instagram safe zones: top 250px and bottom 310px are covered by UI chrome — all critical content between y=260 and y=1620, never closer than 60px to left/right edge

---

## SERIES DESIGN RULES — mandatory, apply identically across all 3 stories
This story is part of a 3-story campaign series. All three must share the same visual skeleton so they look like a professional, unified set when viewed side by side. Follow these rules exactly.

### FONT
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap" rel="stylesheet">
Use ONLY 'Poppins', sans-serif. No other typefaces.

### BACKGROUND
- Base: ${b.backgroundColor} solid fill on <body>
- Single overlay <div> filling the canvas: background: radial-gradient(ellipse 80% 60% at 85% 5%, rgba(${hexToRgb(b.brandColor)}, 0.12) 0%, transparent 60%)
- Nothing else behind the content

### LOGO ZONE — y=270 to y=420 (pixel-perfect identical in every story)
- position:absolute; top:270px; left:0; right:0; height:150px
- border-bottom: 1px solid rgba(255,255,255,0.08)
- Display centred horizontally and vertically:
${b.logoUrl
    ? `  <img src="${b.logoUrl}" style="height:72px;object-fit:contain" crossorigin="anonymous">`
    : `  <span style="font-size:48px;font-weight:700;color:${b.textColor};letter-spacing:0.1em;text-transform:uppercase">${b.studioName}</span>`}

### TRUST ROW — y=1390 to y=1460 (identical in every story)
- position:absolute; top:1390px; left:0; right:0
- Three pills, horizontal flex, centred, gap:16px
- Each pill: background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:999px; padding:12px 28px; font-size:26px; font-weight:500; color:${b.textColor}; opacity:0.8; white-space:nowrap
- Fixed labels (exact): "No app" · "Free to join" · "Wallet card"

### CTA BAR — y=1480 to y=1600 (identical in every story)
- position:absolute; top:1480px; left:60px; right:60px; height:120px
- background:${b.brandColor}; border-radius:20px; display:flex; align-items:center; justify-content:space-between; padding:0 48px
- Left: "Tap to join →" — font-size:44px; font-weight:700; color:#ffffff
- Right: "${b.signupUrl}" — font-size:24px; font-weight:500; color:rgba(255,255,255,0.8)

### ACCENT SYSTEM (consistent across series)
- ${b.brandColor} for: key numbers, stats, progress fills, icon backgrounds, highlights
- Glows: box-shadow: 0 0 60px rgba(${hexToRgb(b.brandColor)}, 0.4) on featured elements
- Badges/cards: background:rgba(255,255,255,0.05); border:1px solid rgba(${hexToRgb(b.brandColor)}, 0.25); border-radius:16px
- Dividers: 1px solid rgba(255,255,255,0.08)

### HERO ZONE — y=435 to y=1375 (story-specific — only this area differs between stories)
- This is where the unique message lives. Design it around the brief below.
- Contrast ≥ 4.5:1 for all text
- Headline: 96–130px, font-weight:900, tight letter-spacing
- Sub-headline: 48–66px, font-weight:700
- Body: 34–42px, font-weight:400–500
- One message, one action — no clutter
- One subtle fade-in (opacity 0→1, 0.6s ease) on main content is fine

---

Output ONLY the complete HTML document. No markdown fences, no explanations.
For refinements: output the complete updated HTML document.`
}

export async function POST(request: NextRequest) {
  // Auth
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { studioId, messages } = body as { studioId: string; messages: StoryMessage[] }

  if (!studioId || !messages?.length) {
    return NextResponse.json({ error: 'studioId and messages are required' }, { status: 400 })
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Turn limit
  const assistantTurns = messages.filter((m) => m.role === 'assistant').length
  if (assistantTurns >= MAX_TURNS) {
    return NextResponse.json({ error: 'Max refinement turns reached' }, { status: 429 })
  }

  // Fetch all studio data in parallel
  const [
    { data: studio },
    { data: template },
    { data: landingPage },
  ] = await Promise.all([
    supabase.from('studios').select('name, settings').eq('id', studioId).single(),
    supabase
      .from('pass_templates')
      .select('logo_url, icon_url, tier_themes, static_texts')
      .eq('studio_id', studioId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('studio_landing_pages')
      .select('slug, settings')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  // Rewards config
  const settings = (studio?.settings ?? {}) as Record<string, unknown>
  const rewardsConfig = settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : null
  const currency = (settings.currency as string) ?? 'DKK'

  const tiers = rewardsConfig?.tiers.map((t, i) => ({
    name: t.name,
    cashbackRate: t.cashback_rate,
    isBase: i === 0,
  })) ?? [{ name: 'Loyalty', cashbackRate: 7.5, isBase: true }]

  const referralEnabled = rewardsConfig?.referrals?.enabled ?? false
  const referralBonusPerRef = rewardsConfig?.referrals?.referrer_cashback_bonus_per_ref ?? 0
  const referralCap = rewardsConfig?.referrals?.referrer_cashback_cap ?? 0
  const friendCashbackRate = rewardsConfig?.referrals?.friend_cashback_rate ?? 0
  const friendWelcomeBonus = rewardsConfig?.referrals?.friend_welcome_bonus ?? 0

  // Landing page colors — preferred over pass template colors for stories
  const lpSettings = (landingPage?.settings ?? {}) as Record<string, unknown>
  const brandColor = (lpSettings.brandColor as string) ?? '#7C3AED'
  const backgroundColor = (lpSettings.backgroundColor as string) ?? '#0A0A0A'
  const textColor = (lpSettings.textColor as string) ?? '#FFFFFF'

  // Benefits from landing page (custom or default text)
  const rawBenefits = lpSettings.benefits as { text: string }[] | undefined
  const benefits: string[] = rawBenefits?.map((b) => b.text).filter(Boolean) ?? []

  // Logo: prefer landing page logo, fall back to pass template
  const logoUrl = (lpSettings.logoUrl as string | null) ?? template?.logo_url ?? template?.icon_url ?? null

  // Signup URL
  const signupUrl = landingPage?.slug
    ? `${MARKETING_URL}/join/${landingPage.slug}`
    : MARKETING_URL

  const brand: BrandContext = {
    studioName: studio?.name ?? 'Studio',
    signupUrl,
    brandColor,
    backgroundColor,
    textColor,
    logoUrl,
    currency,
    tiers,
    referralEnabled,
    referralBonusPerRef,
    referralCap,
    friendCashbackRate,
    friendWelcomeBonus,
    benefits,
  }

  // Call OpenRouter
  const openRouterMessages = [
    { role: 'system', content: buildSystemPrompt(brand) },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  let raw: string
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://loyalink.ai',
        'X-Title': 'Loyalink Stories',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: openRouterMessages,
        max_tokens: 8192,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[story] OpenRouter error:', res.status, err)
      throw new Error(`OpenRouter ${res.status}`)
    }

    const data = await res.json()
    raw = data.choices?.[0]?.message?.content?.trim() ?? ''
  } catch (err) {
    console.error('[story] generation error:', err)
    return NextResponse.json({ error: 'Failed to generate story — check OPENROUTER_API_KEY' }, { status: 500 })
  }

  // Strip markdown fences if the model wrapped the HTML
  const html = raw
    .replace(/^```(?:html)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  return NextResponse.json({ html })
}

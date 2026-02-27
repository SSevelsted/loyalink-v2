import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { migrateRewardsConfig } from '@/types/database'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_TURNS = 4
const OPENROUTER_MODEL = 'google/gemini-3-pro-image-preview'

type StoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

type BrandContext = {
  studioName: string
  primaryColor: string
  secondaryColor: string
  labelColor: string
  logoUrl: string | null
  currency: string
  tiers: { name: string; cashbackRate: number; isBase: boolean }[]
  referralEnabled: boolean
  referralBonusPerRef: number
  referralCap: number
  referralText: string
  howItWorks: string
}

function buildSystemPrompt(b: BrandContext) {
  const tierLines = b.tiers
    .map((t) => `  - ${t.name}: ${t.cashbackRate}% cashback${t.isBase ? ' (entry tier)' : ''}`)
    .join('\n')

  return `You are an expert Instagram Story designer for fitness and wellness studios.

## Studio brand
- Name: ${b.studioName}
- Primary color: ${b.primaryColor}
- Accent / text-on-primary color: ${b.secondaryColor}
- Label / muted color: ${b.labelColor}
${b.logoUrl ? `- Logo URL: ${b.logoUrl}` : '- No logo provided'}

## Loyalty program
- Currency: ${b.currency}
- Loyalty tiers:
${tierLines}
${b.referralEnabled ? `- Referral program: members earn ${b.referralBonusPerRef}% extra cashback per referral (capped at ${b.referralCap}%)` : '- No referral program'}
- Tagline on pass: "${b.referralText}"
- How it works copy: "${b.howItWorks}"

## Output rules
- Generate a self-contained HTML document for an Instagram Story (1080×1920 px)
- <body> must be exactly 1080px wide and 1920px tall — overflow hidden, margin 0, padding 0
- Use inline CSS only. Google Fonts may be loaded via <link> in <head>
- Use the brand colors and real program data (tier names, cashback rates, currency) from above
- Do NOT show dollar signs or invent numbers — use the actual rates and currency provided
- If a logo URL is provided, include it with crossorigin="anonymous"
- Make the design bold and visually striking — suitable for Instagram Stories
- Output ONLY the complete HTML document, no markdown fences, no explanations
- When the user asks for changes, output the complete updated HTML document`
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
    { data: sampleCustomer },
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
      .from('customers')
      .select('currency')
      .eq('studio_id', studioId)
      .limit(1)
      .maybeSingle(),
  ])

  // Brand colors
  const tierThemes = (template?.tier_themes ?? {}) as Record<
    string,
    { backgroundColor?: string; foregroundColor?: string; labelColor?: string }
  >
  const baseTheme = tierThemes['base'] ?? {}

  // Rewards config
  const settings = (studio?.settings ?? {}) as Record<string, unknown>
  const rewardsConfig = settings?.rewards_config
    ? migrateRewardsConfig(settings.rewards_config)
    : null

  const tiers = rewardsConfig?.tiers.map((t, i) => ({
    name: t.name,
    cashbackRate: t.cashback_rate,
    isBase: i === 0,
  })) ?? [{ name: 'Loyalty', cashbackRate: 7.5, isBase: true }]

  const referralEnabled = rewardsConfig?.referrals?.enabled ?? false
  const referralBonusPerRef = rewardsConfig?.referrals?.referrer_cashback_bonus_per_ref ?? 0
  const referralCap = rewardsConfig?.referrals?.referrer_cashback_cap ?? 0

  // Static texts
  const staticTexts = (template?.static_texts ?? {}) as Record<string, string>

  const brand: BrandContext = {
    studioName: studio?.name ?? 'Studio',
    primaryColor: baseTheme.backgroundColor ?? '#1a1a2e',
    secondaryColor: baseTheme.foregroundColor ?? '#ffffff',
    labelColor: baseTheme.labelColor ?? '#cccccc',
    logoUrl: template?.logo_url ?? template?.icon_url ?? null,
    currency: sampleCustomer?.currency ?? 'DKK',
    tiers,
    referralEnabled,
    referralBonusPerRef,
    referralCap,
    referralText: staticTexts.referralText ?? 'Refer Friends. Both Earn Cashback.',
    howItWorks: staticTexts.howItWorks ?? '1. Scan. Earn. Repeat.',
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
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://loyalink.ai',
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

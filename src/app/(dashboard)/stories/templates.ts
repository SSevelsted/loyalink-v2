// ─── Story templates: 5 designs × 3 stories ────────────────────────────
// Each design owns its ENTIRE 1080×1920 layout — no shared layout helpers.
// All customer-facing text is translated to the studio's language.

export type StoryCopyOverrides = {
  reward_headline?: string
  reward_sub?: string
  reward_supporting?: string
  reward_bottom?: string
  levelup_headline?: string
  levelup_sub?: string
  levelup_bottom?: string
  thirty_headline?: string
  thirty_sub?: string
  thirty_step1?: string
  thirty_step2?: string
  thirty_step3?: string
  thirty_bottom?: string
  cta_text?: string
}

export type BrandContext = {
  studioName: string
  signupUrl: string
  brandColor: string
  backgroundColor: string
  textColor: string
  logoUrl: string | null
  currency: string
  language: string
  tiers: { name: string; cashbackRate: number; isBase: boolean }[]
  referralEnabled: boolean
  referralBonusPerRef: number
  referralCap: number
  friendCashbackRate: number
  friendWelcomeBonus: number
  benefits: string[]
  storyOverrides?: StoryCopyOverrides
}

// ─── Story types ────────────────────────────────────────────────────────

export type StoryType = { id: string; label: string; subtitle: string }

export const STORY_TYPES: StoryType[] = [
  { id: 'reward', label: 'The Reward', subtitle: 'Lead with cashback' },
  { id: 'level-up', label: 'Level Up', subtitle: 'Show the tier journey' },
  { id: 'thirty-seconds', label: '30 Seconds', subtitle: 'Zero friction signup' },
]

// ─── Design styles ──────────────────────────────────────────────────────

export type DesignStyle = {
  id: string
  label: string
  subtitle: string
  usesBackgroundImage?: boolean
}

export const DESIGN_STYLES: DesignStyle[] = [
  { id: 'minimal', label: 'Minimal', subtitle: 'Clean & spacious' },
  { id: 'neon', label: 'Neon', subtitle: 'Glowing & bold' },
  { id: 'editorial', label: 'Editorial', subtitle: 'Magazine style' },
  { id: 'bold', label: 'Bold', subtitle: 'All brand color' },
  { id: 'photo', label: 'Photo', subtitle: 'Your background', usesBackgroundImage: true },
]

// ─── Translations ───────────────────────────────────────────────────────

type StoryStrings = {
  // Shared
  noApp: string
  freeToJoin: string
  walletCard: string
  tapToJoin: string
  trustLine: string // combined single-line version

  // Story 1: The Reward
  rewardGetUpTo: string
  rewardCashback: string
  rewardOnEveryVisit: string
  rewardStartAt: (rate: number) => string

  // Story 2: Level Up
  levelUpHeadline: string
  levelUpSub: string
  levelUpYouStartHere: string
  levelUpBottom: string

  // Story 3: 30 Seconds
  thirtyHeadline: string
  thirtySub: string
  thirtyStep1: string
  thirtyStep2: string
  thirtyStep3: (rate: number) => string
  thirtyBottom: string
}

const strings: Record<string, StoryStrings> = {
  en: {
    noApp: 'No app',
    freeToJoin: 'Free to join',
    walletCard: 'Wallet card',
    tapToJoin: 'Tap to join →',
    trustLine: 'No app needed · Free to join · Apple & Google Wallet',
    rewardGetUpTo: 'Get up to',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'on every visit',
    rewardStartAt: (r) => `Start at ${r}% from day one`,
    levelUpHeadline: 'The more you visit,\nthe more you earn.',
    levelUpSub: 'Your rewards grow with you.',
    levelUpYouStartHere: 'You start here',
    levelUpBottom: 'No fees. No commitment. Just rewards.',
    thirtyHeadline: 'Join in\n30 seconds.',
    thirtySub: "It's that easy.",
    thirtyStep1: 'Tap the link',
    thirtyStep2: 'Type your name',
    thirtyStep3: (r) => `Get ${r}% cashback`,
    thirtyBottom: 'No app. No card. No strings.',
  },
  da: {
    noApp: 'Ingen app',
    freeToJoin: 'Gratis at tilmelde',
    walletCard: 'Wallet-kort',
    tapToJoin: 'Tryk for at tilmelde →',
    trustLine: 'Ingen app · Gratis · Apple & Google Wallet',
    rewardGetUpTo: 'Få op til',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'ved hvert besøg',
    rewardStartAt: (r) => `Start med ${r}% fra dag ét`,
    levelUpHeadline: 'Jo mere du besøger,\njo mere tjener du.',
    levelUpSub: 'Dine belønninger vokser med dig.',
    levelUpYouStartHere: 'Du starter her',
    levelUpBottom: 'Ingen gebyrer. Ingen binding. Bare belønninger.',
    thirtyHeadline: 'Tilmeld dig på\n30 sekunder.',
    thirtySub: 'Så nemt er det.',
    thirtyStep1: 'Tryk på linket',
    thirtyStep2: 'Skriv dit navn',
    thirtyStep3: (r) => `Få ${r}% cashback`,
    thirtyBottom: 'Ingen app. Ingen kort. Ingen binding.',
  },
  sv: {
    noApp: 'Ingen app',
    freeToJoin: 'Gratis att gå med',
    walletCard: 'Wallet-kort',
    tapToJoin: 'Tryck för att gå med →',
    trustLine: 'Ingen app · Gratis · Apple & Google Wallet',
    rewardGetUpTo: 'Få upp till',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'vid varje besök',
    rewardStartAt: (r) => `Börja med ${r}% från dag ett`,
    levelUpHeadline: 'Ju mer du besöker,\ndesto mer tjänar du.',
    levelUpSub: 'Dina belöningar växer med dig.',
    levelUpYouStartHere: 'Du börjar här',
    levelUpBottom: 'Inga avgifter. Inget åtagande. Bara belöningar.',
    thirtyHeadline: 'Gå med på\n30 sekunder.',
    thirtySub: 'Så enkelt är det.',
    thirtyStep1: 'Tryck på länken',
    thirtyStep2: 'Skriv ditt namn',
    thirtyStep3: (r) => `Få ${r}% cashback`,
    thirtyBottom: 'Ingen app. Inget kort. Inga villkor.',
  },
  no: {
    noApp: 'Ingen app',
    freeToJoin: 'Gratis å bli med',
    walletCard: 'Wallet-kort',
    tapToJoin: 'Trykk for å bli med →',
    trustLine: 'Ingen app · Gratis · Apple & Google Wallet',
    rewardGetUpTo: 'Få opptil',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'på hvert besøk',
    rewardStartAt: (r) => `Start med ${r}% fra dag én`,
    levelUpHeadline: 'Jo mer du besøker,\njo mer tjener du.',
    levelUpSub: 'Belønningene dine vokser med deg.',
    levelUpYouStartHere: 'Du starter her',
    levelUpBottom: 'Ingen avgifter. Ingen binding. Bare belønninger.',
    thirtyHeadline: 'Bli med på\n30 sekunder.',
    thirtySub: 'Så enkelt er det.',
    thirtyStep1: 'Trykk på lenken',
    thirtyStep2: 'Skriv navnet ditt',
    thirtyStep3: (r) => `Få ${r}% cashback`,
    thirtyBottom: 'Ingen app. Ingen kort. Ingen binding.',
  },
  de: {
    noApp: 'Keine App',
    freeToJoin: 'Kostenlos',
    walletCard: 'Wallet-Karte',
    tapToJoin: 'Tippen zum Beitreten →',
    trustLine: 'Keine App · Kostenlos · Apple & Google Wallet',
    rewardGetUpTo: 'Erhalte bis zu',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'bei jedem Besuch',
    rewardStartAt: (r) => `Starte mit ${r}% ab Tag eins`,
    levelUpHeadline: 'Je öfter du kommst,\ndesto mehr verdienst du.',
    levelUpSub: 'Deine Belohnungen wachsen mit dir.',
    levelUpYouStartHere: 'Du startest hier',
    levelUpBottom: 'Keine Gebühren. Keine Bindung. Nur Belohnungen.',
    thirtyHeadline: 'Anmelden in\n30 Sekunden.',
    thirtySub: 'So einfach ist es.',
    thirtyStep1: 'Link antippen',
    thirtyStep2: 'Namen eingeben',
    thirtyStep3: (r) => `${r}% Cashback erhalten`,
    thirtyBottom: 'Keine App. Keine Karte. Keine Verpflichtung.',
  },
  fr: {
    noApp: 'Sans appli',
    freeToJoin: 'Gratuit',
    walletCard: 'Carte Wallet',
    tapToJoin: 'Appuyez pour rejoindre →',
    trustLine: 'Sans appli · Gratuit · Apple & Google Wallet',
    rewardGetUpTo: "Jusqu'à",
    rewardCashback: 'de Cashback',
    rewardOnEveryVisit: 'à chaque visite',
    rewardStartAt: (r) => `Commencez à ${r}% dès le premier jour`,
    levelUpHeadline: 'Plus vous venez,\nplus vous gagnez.',
    levelUpSub: 'Vos récompenses grandissent avec vous.',
    levelUpYouStartHere: 'Vous commencez ici',
    levelUpBottom: 'Sans frais. Sans engagement. Que des récompenses.',
    thirtyHeadline: 'Inscrivez-vous en\n30 secondes.',
    thirtySub: "C'est aussi simple que ça.",
    thirtyStep1: 'Appuyez sur le lien',
    thirtyStep2: 'Entrez votre nom',
    thirtyStep3: (r) => `Obtenez ${r}% de cashback`,
    thirtyBottom: 'Sans appli. Sans carte. Sans engagement.',
  },
  es: {
    noApp: 'Sin app',
    freeToJoin: 'Gratis',
    walletCard: 'Tarjeta Wallet',
    tapToJoin: 'Toca para unirte →',
    trustLine: 'Sin app · Gratis · Apple & Google Wallet',
    rewardGetUpTo: 'Obtén hasta',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'en cada visita',
    rewardStartAt: (r) => `Empieza con ${r}% desde el día uno`,
    levelUpHeadline: 'Cuanto más visitas,\nmás ganas.',
    levelUpSub: 'Tus recompensas crecen contigo.',
    levelUpYouStartHere: 'Empiezas aquí',
    levelUpBottom: 'Sin costes. Sin compromiso. Solo recompensas.',
    thirtyHeadline: 'Únete en\n30 segundos.',
    thirtySub: 'Así de fácil.',
    thirtyStep1: 'Toca el enlace',
    thirtyStep2: 'Escribe tu nombre',
    thirtyStep3: (r) => `Obtén ${r}% de cashback`,
    thirtyBottom: 'Sin app. Sin tarjeta. Sin compromiso.',
  },
  nl: {
    noApp: 'Geen app',
    freeToJoin: 'Gratis',
    walletCard: 'Wallet-kaart',
    tapToJoin: 'Tik om lid te worden →',
    trustLine: 'Geen app · Gratis · Apple & Google Wallet',
    rewardGetUpTo: 'Ontvang tot',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'bij elk bezoek',
    rewardStartAt: (r) => `Begin met ${r}% vanaf dag één`,
    levelUpHeadline: 'Hoe vaker je komt,\nhoe meer je verdient.',
    levelUpSub: 'Je beloningen groeien met je mee.',
    levelUpYouStartHere: 'Je begint hier',
    levelUpBottom: 'Geen kosten. Geen verplichtingen. Alleen beloningen.',
    thirtyHeadline: 'Meld je aan in\n30 seconden.',
    thirtySub: 'Zo makkelijk is het.',
    thirtyStep1: 'Tik op de link',
    thirtyStep2: 'Vul je naam in',
    thirtyStep3: (r) => `Krijg ${r}% cashback`,
    thirtyBottom: 'Geen app. Geen pas. Geen verplichtingen.',
  },
  pl: {
    noApp: 'Bez aplikacji',
    freeToJoin: 'Za darmo',
    walletCard: 'Karta Wallet',
    tapToJoin: 'Kliknij, aby dołączyć →',
    trustLine: 'Bez aplikacji · Za darmo · Apple & Google Wallet',
    rewardGetUpTo: 'Otrzymaj do',
    rewardCashback: 'Cashback',
    rewardOnEveryVisit: 'przy każdej wizycie',
    rewardStartAt: (r) => `Zacznij od ${r}% od pierwszego dnia`,
    levelUpHeadline: 'Im częściej przychodzisz,\ntym więcej zarabiasz.',
    levelUpSub: 'Twoje nagrody rosną razem z Tobą.',
    levelUpYouStartHere: 'Zaczynasz tutaj',
    levelUpBottom: 'Bez opłat. Bez zobowiązań. Same nagrody.',
    thirtyHeadline: 'Dołącz w\n30 sekund.',
    thirtySub: 'To naprawdę takie proste.',
    thirtyStep1: 'Kliknij w link',
    thirtyStep2: 'Wpisz swoje imię',
    thirtyStep3: (r) => `Otrzymaj ${r}% cashback`,
    thirtyBottom: 'Bez aplikacji. Bez karty. Bez zobowiązań.',
  },
}

function t(lang: string): StoryStrings {
  return strings[lang] ?? strings.en
}

// ─── Editable field definitions per story (for the edit panel) ─────────

export type StoryFieldDef = { key: keyof StoryCopyOverrides; label: string }

export const STORY_FIELD_DEFS: Record<string, StoryFieldDef[]> = {
  reward: [
    { key: 'reward_headline', label: 'Headline' },
    { key: 'reward_sub', label: 'Subheadline' },
    { key: 'reward_supporting', label: 'Supporting text' },
    { key: 'reward_bottom', label: 'Bottom line' },
    { key: 'cta_text', label: 'CTA text' },
  ],
  'level-up': [
    { key: 'levelup_headline', label: 'Headline' },
    { key: 'levelup_sub', label: 'Subheadline' },
    { key: 'levelup_bottom', label: 'Bottom line' },
    { key: 'cta_text', label: 'CTA text' },
  ],
  'thirty-seconds': [
    { key: 'thirty_headline', label: 'Headline' },
    { key: 'thirty_sub', label: 'Subheadline' },
    { key: 'thirty_step1', label: 'Step 1' },
    { key: 'thirty_step2', label: 'Step 2' },
    { key: 'thirty_step3', label: 'Step 3' },
    { key: 'thirty_bottom', label: 'Bottom line' },
    { key: 'cta_text', label: 'CTA text' },
  ],
}

// ─── Variable interpolation ────────────────────────────────────────────

function interpolate(text: string, b: BrandContext): string {
  const base = b.tiers[0]?.cashbackRate ?? 0
  const top = b.tiers[b.tiers.length - 1]?.cashbackRate ?? base
  return text
    .replace(/\{studioName\}/g, b.studioName)
    .replace(/\{baseRate\}/g, String(base))
    .replace(/\{topRate\}/g, String(top))
    .replace(/\{signupUrl\}/g, b.signupUrl)
}

/** Get resolved copy for a field — override (with interpolation) > translation default */
function resolveCopy(b: BrandContext, key: keyof StoryCopyOverrides, fallback: string): string {
  const override = b.storyOverrides?.[key]
  if (override !== undefined && override !== '') return interpolate(override, b)
  return fallback
}

/** Get the default (un-interpolated) text for a field, given the language */
export function getDefaultCopy(lang: string, key: keyof StoryCopyOverrides, baseRate: number, topRate: number): string {
  const s = t(lang)
  const defaults: Record<keyof StoryCopyOverrides, string> = {
    reward_headline: '{baseRate}% cashback',
    reward_sub: s === strings.en ? 'from day one' : s.rewardOnEveryVisit,
    reward_supporting: `up to {topRate}% as you grow`,
    reward_bottom: s === strings.en ? 'Free to join \u00B7 Cashback added automatically' : s.trustLine,
    levelup_headline: s.levelUpHeadline,
    levelup_sub: s.levelUpSub,
    levelup_bottom: s.levelUpBottom,
    thirty_headline: s.thirtyHeadline,
    thirty_sub: s.thirtySub,
    thirty_step1: s.thirtyStep1,
    thirty_step2: s.thirtyStep2,
    thirty_step3: s.thirtyStep3(baseRate),
    thirty_bottom: s.thirtyBottom,
    cta_text: s.tapToJoin,
  }
  return defaults[key]
}

// ─── Helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : '124, 58, 237'
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Convert \n in translated strings to <br> */
function nl2br(s: string): string {
  return esc(s).replace(/\n/g, '<br>')
}

const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap" rel="stylesheet">'

function head(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT_LINK}<style>*{margin:0;padding:0;box-sizing:border-box}@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}</style></head>`
}

// ─── Hero content builders ──────────────────────────────────────────────

type Align = 'center' | 'left'

function heroReward(b: BrandContext, accent: string, align: Align): string {
  const s = t(b.language)
  const base = b.tiers[0]
  const top = b.tiers[b.tiers.length - 1]
  const rgb = hexToRgb(accent)
  const ta = align === 'left' ? 'text-align:left' : 'text-align:center'
  const mx = align === 'center' ? 'margin:36px auto' : 'margin:36px 0'

  const headline = resolveCopy(b, 'reward_headline', `${base.cashbackRate}% cashback`)
  const sub = resolveCopy(b, 'reward_sub', s === strings.en ? 'from day one' : s.rewardOnEveryVisit)
  const supporting = resolveCopy(b, 'reward_supporting', `up to ${top.cashbackRate}% as you grow`)
  const bottom = resolveCopy(b, 'reward_bottom', s === strings.en ? 'Free to join \u00B7 Cashback added automatically' : s.trustLine)

  return `
<div style="${ta};animation:fadeIn 0.6s ease;width:100%">
  <div style="position:relative;display:inline-block;margin-bottom:28px">
    <div style="position:absolute;inset:-50px;border-radius:50%;background:radial-gradient(circle, rgba(${rgb}, 0.3) 0%, transparent 70%);pointer-events:none"></div>
    <span style="font-size:200px;font-weight:900;line-height:1;color:${accent};text-shadow:0 0 80px rgba(${rgb}, 0.5)">${base.cashbackRate}%</span>
  </div>
  <p style="font-size:52px;font-weight:700;line-height:1.2;margin-bottom:8px">${nl2br(headline)}</p>
  <p style="font-size:38px;font-weight:500;opacity:0.7;margin-bottom:20px">${nl2br(sub)}</p>
  <div style="width:80px;height:3px;background:${accent};opacity:0.4;${mx}"></div>
  <p style="font-size:30px;font-weight:500;opacity:0.5;margin-top:4px">${nl2br(supporting)}</p>
  <p style="font-size:26px;font-weight:400;opacity:0.4;margin-top:28px">${nl2br(bottom)}</p>
</div>`
}

function heroLevelUp(b: BrandContext, accent: string, align: Align): string {
  const s = t(b.language)
  const rgb = hexToRgb(accent)
  const total = b.tiers.length
  const ta = align === 'left' ? 'text-align:left' : 'text-align:center'

  const tierCards = b.tiers
    .map((tier, i) => {
      const intensity = 0.08 + (i / Math.max(total - 1, 1)) * 0.35
      const borderI = 0.15 + (i / Math.max(total - 1, 1)) * 0.45
      const isTop = i === total - 1
      const isBase = i === 0
      return `
<div style="width:100%;background:rgba(${rgb}, ${intensity.toFixed(2)});border:1px solid rgba(${rgb}, ${borderI.toFixed(2)});border-radius:16px;padding:24px 36px;display:flex;align-items:center;justify-content:space-between;${isTop ? `box-shadow:0 0 50px rgba(${rgb}, 0.35);` : ''}">
  <div>
    ${isBase ? `<span style="font-size:20px;font-weight:500;opacity:0.45">${esc(s.levelUpYouStartHere)}</span><br>` : ''}
    <span style="font-size:${isTop ? 38 : 32}px;font-weight:${isTop ? 700 : 600};text-transform:uppercase;letter-spacing:0.06em">${esc(tier.name)}</span>
  </div>
  <span style="font-size:${isTop ? 50 : 42}px;font-weight:900;color:${accent}">${tier.cashbackRate}%</span>
</div>`
    })
    .join('')

  const headline = resolveCopy(b, 'levelup_headline', s.levelUpHeadline)
  const sub = resolveCopy(b, 'levelup_sub', s.levelUpSub)
  const bottom = resolveCopy(b, 'levelup_bottom', s.levelUpBottom)

  return `
<div style="${ta};width:100%;animation:fadeIn 0.6s ease">
  <p style="font-size:46px;font-weight:700;line-height:1.2;margin-bottom:8px">${nl2br(headline)}</p>
  <p style="font-size:30px;font-weight:400;opacity:0.55;margin-bottom:36px">${esc(sub)}</p>
  <div style="display:flex;flex-direction:column;gap:14px;width:100%">
    ${tierCards}
  </div>
  <p style="font-size:28px;font-weight:500;opacity:0.45;margin-top:28px">${esc(bottom)}</p>
</div>`
}

function hero30Seconds(b: BrandContext, accent: string, align: Align): string {
  const s = t(b.language)
  const base = b.tiers[0]
  const rgb = hexToRgb(accent)
  const ta = align === 'left' ? 'text-align:left' : 'text-align:center'

  const headline = resolveCopy(b, 'thirty_headline', s.thirtyHeadline)
  const sub = resolveCopy(b, 'thirty_sub', s.thirtySub)
  const step1 = resolveCopy(b, 'thirty_step1', s.thirtyStep1)
  const step2 = resolveCopy(b, 'thirty_step2', s.thirtyStep2)
  const step3 = resolveCopy(b, 'thirty_step3', s.thirtyStep3(base.cashbackRate))
  const bottom = resolveCopy(b, 'thirty_bottom', s.thirtyBottom)

  const steps = [
    { num: '1', text: step1 },
    { num: '2', text: step2 },
    { num: '3', text: step3 },
  ]

  const stepCards = steps
    .map(
      (step) => `
<div style="display:flex;align-items:center;gap:28px;width:100%;background:rgba(${rgb}, 0.08);border:1px solid rgba(${rgb}, 0.18);border-radius:16px;padding:28px 36px">
  <div style="flex-shrink:0;width:68px;height:68px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700;color:#fff">${step.num}</div>
  <span style="font-size:36px;font-weight:600">${esc(step.text)}</span>
</div>`
    )
    .join('')

  return `
<div style="${ta};width:100%;animation:fadeIn 0.6s ease">
  <p style="font-size:56px;font-weight:900;line-height:1.15;margin-bottom:8px">${nl2br(headline)}</p>
  <p style="font-size:32px;font-weight:400;opacity:0.55;margin-bottom:40px">${esc(sub)}</p>
  <div style="display:flex;flex-direction:column;gap:14px;width:100%;margin-bottom:32px">
    ${stepCards}
  </div>
  <p style="font-size:28px;font-weight:500;opacity:0.45">${esc(bottom)}</p>
</div>`
}

type HeroBuilder = (b: BrandContext, accent: string, align: Align) => string

const HERO_BUILDERS: Record<string, HeroBuilder> = {
  reward: heroReward,
  'level-up': heroLevelUp,
  'thirty-seconds': hero30Seconds,
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN 1: MINIMAL — ultra-clean, huge whitespace, full-bleed CTA
// ═══════════════════════════════════════════════════════════════════════════

function shellMinimal(b: BrandContext, heroHtml: string): string {
  const s = t(b.language)
  const cta = resolveCopy(b, 'cta_text', s.tapToJoin)
  const rgb = hexToRgb(b.brandColor)
  const logo = b.logoUrl
    ? `<img src="${esc(b.logoUrl)}" style="height:40px;object-fit:contain" crossorigin="anonymous">`
    : `<span style="font-size:28px;font-weight:700;color:${b.textColor};letter-spacing:0.08em;text-transform:uppercase">${esc(b.studioName)}</span>`

  return `${head()}
<body style="width:1080px;height:1920px;position:relative;overflow:hidden;font-family:'Poppins',sans-serif;background:${b.backgroundColor};color:${b.textColor}">
<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 80% 10%, rgba(${rgb}, 0.08) 0%, transparent 60%);pointer-events:none"></div>
<div style="position:absolute;top:280px;left:72px;display:flex;align-items:center;gap:16px">${logo}</div>
<div style="position:absolute;top:440px;left:0;right:0;bottom:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 72px">${heroHtml}</div>
<div style="position:absolute;bottom:240px;left:0;right:0;text-align:center">
  <p style="font-size:26px;font-weight:400;opacity:0.4;letter-spacing:0.06em">${esc(s.trustLine)}</p>
</div>
<div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:${b.brandColor};display:flex;align-items:center;justify-content:space-between;padding:0 72px">
  <span style="font-size:44px;font-weight:700;color:#ffffff">${esc(cta)}</span>
  <span style="font-size:22px;font-weight:500;color:rgba(255,255,255,0.7)">${esc(b.signupUrl)}</span>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN 2: NEON — glowing card on dark bg, neon blobs, pill CTA
// ═══════════════════════════════════════════════════════════════════════════

function shellNeon(b: BrandContext, heroHtml: string): string {
  const s = t(b.language)
  const cta = resolveCopy(b, 'cta_text', s.tapToJoin)
  const rgb = hexToRgb(b.brandColor)
  const logo = b.logoUrl
    ? `<img src="${esc(b.logoUrl)}" style="height:64px;object-fit:contain" crossorigin="anonymous">`
    : `<span style="font-size:42px;font-weight:700;color:${b.textColor};letter-spacing:0.1em;text-transform:uppercase">${esc(b.studioName)}</span>`

  return `${head()}
<body style="width:1080px;height:1920px;position:relative;overflow:hidden;font-family:'Poppins',sans-serif;background:#050508;color:#ffffff">
<div style="position:absolute;top:-150px;left:-120px;width:500px;height:500px;border-radius:50%;background:rgba(${rgb}, 0.2);filter:blur(100px);pointer-events:none"></div>
<div style="position:absolute;bottom:-100px;right:-80px;width:400px;height:400px;border-radius:50%;background:rgba(${rgb}, 0.15);filter:blur(80px);pointer-events:none"></div>
<div style="position:absolute;top:270px;left:0;right:0;display:flex;justify-content:center">${logo}</div>
<div style="position:absolute;top:400px;left:48px;right:48px;bottom:220px;background:rgba(255,255,255,0.03);border:1px solid rgba(${rgb}, 0.3);border-radius:40px;box-shadow:0 0 80px rgba(${rgb}, 0.2),inset 0 0 80px rgba(${rgb}, 0.03);display:flex;flex-direction:column;padding:56px 48px 40px">
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 12px">${heroHtml}</div>
  <div style="display:flex;justify-content:center;gap:16px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06)">
    <span style="font-size:24px;font-weight:500;opacity:0.5">${esc(s.noApp)}</span>
    <span style="font-size:24px;opacity:0.2">·</span>
    <span style="font-size:24px;font-weight:500;opacity:0.5">${esc(s.freeToJoin)}</span>
    <span style="font-size:24px;opacity:0.2">·</span>
    <span style="font-size:24px;font-weight:500;opacity:0.5">${esc(s.walletCard)}</span>
  </div>
</div>
<div style="position:absolute;bottom:60px;left:80px;right:80px;height:110px;background:${b.brandColor};border-radius:55px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;box-shadow:0 0 40px rgba(${rgb}, 0.4)">
  <span style="font-size:40px;font-weight:700;color:#ffffff">${esc(cta)}</span>
  <span style="font-size:22px;font-weight:500;color:rgba(255,255,255,0.7)">${esc(b.signupUrl)}</span>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN 3: EDITORIAL — thick left accent bar, asymmetric, left-aligned
// ═══════════════════════════════════════════════════════════════════════════

function shellEditorial(b: BrandContext, heroHtml: string): string {
  const s = t(b.language)
  const cta = resolveCopy(b, 'cta_text', s.tapToJoin)
  const logo = b.logoUrl
    ? `<img src="${esc(b.logoUrl)}" style="height:48px;object-fit:contain" crossorigin="anonymous">`
    : `<span style="font-size:24px;font-weight:700;color:${b.textColor};letter-spacing:0.12em;text-transform:uppercase">${esc(b.studioName)}</span>`

  return `${head()}
<body style="width:1080px;height:1920px;position:relative;overflow:hidden;font-family:'Poppins',sans-serif;background:${b.backgroundColor};color:${b.textColor}">
<div style="position:absolute;top:0;left:0;width:64px;height:100%;background:${b.brandColor}"></div>
<div style="position:absolute;top:50%;left:0;width:64px;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:40px">
  <span style="writing-mode:vertical-rl;text-orientation:mixed;font-size:20px;font-weight:500;color:rgba(255,255,255,0.6);letter-spacing:0.1em">${esc(s.noApp).toUpperCase()}</span>
  <span style="writing-mode:vertical-rl;text-orientation:mixed;font-size:20px;font-weight:500;color:rgba(255,255,255,0.6);letter-spacing:0.1em">${esc(s.freeToJoin).toUpperCase()}</span>
  <span style="writing-mode:vertical-rl;text-orientation:mixed;font-size:20px;font-weight:500;color:rgba(255,255,255,0.6);letter-spacing:0.1em">${esc(s.walletCard).toUpperCase()}</span>
</div>
<div style="position:absolute;top:280px;right:72px">${logo}</div>
<div style="position:absolute;top:400px;left:120px;right:72px;bottom:280px;display:flex;flex-direction:column;justify-content:center">${heroHtml}</div>
<div style="position:absolute;bottom:60px;left:120px;right:60px;height:120px;background:${b.brandColor};border-radius:20px;display:flex;align-items:center;justify-content:space-between;padding:0 44px">
  <span style="font-size:42px;font-weight:700;color:#ffffff">${esc(cta)}</span>
  <span style="font-size:22px;font-weight:500;color:rgba(255,255,255,0.7)">${esc(b.signupUrl)}</span>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN 4: BOLD — two-tone split, brand top, white bottom, logo badge
// ═══════════════════════════════════════════════════════════════════════════

function shellBold(b: BrandContext, heroHtml: string): string {
  const s = t(b.language)
  const cta = resolveCopy(b, 'cta_text', s.tapToJoin)
  const logo = b.logoUrl
    ? `<img src="${esc(b.logoUrl)}" style="height:56px;object-fit:contain" crossorigin="anonymous">`
    : `<span style="font-size:28px;font-weight:900;color:${b.brandColor};letter-spacing:0.1em;text-transform:uppercase">${esc(b.studioName)}</span>`

  return `${head()}
<body style="width:1080px;height:1920px;position:relative;overflow:hidden;font-family:'Poppins',sans-serif;background:#ffffff;color:#1a1a1a">
<div style="position:absolute;top:0;left:0;right:0;height:1060px;background:${b.brandColor}"></div>
<div style="position:absolute;top:0;left:0;right:0;height:1060px;background:radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,255,255,0.1) 0%, transparent 60%);pointer-events:none"></div>
<div style="position:absolute;top:280px;left:0;right:0;height:680px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 72px;color:#ffffff">${heroHtml}</div>
<div style="position:absolute;top:1000px;left:50%;transform:translateX(-50%);width:120px;height:120px;border-radius:50%;background:#ffffff;box-shadow:0 8px 40px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;z-index:2">${logo}</div>
<div style="position:absolute;top:1060px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 72px;gap:32px">
  <div style="display:flex;gap:20px;margin-top:40px">
    <div style="background:rgba(0,0,0,0.05);border-radius:999px;padding:14px 28px;font-size:26px;font-weight:500;color:#555">${esc(s.noApp)}</div>
    <div style="background:rgba(0,0,0,0.05);border-radius:999px;padding:14px 28px;font-size:26px;font-weight:500;color:#555">${esc(s.freeToJoin)}</div>
    <div style="background:rgba(0,0,0,0.05);border-radius:999px;padding:14px 28px;font-size:26px;font-weight:500;color:#555">${esc(s.walletCard)}</div>
  </div>
  <div style="width:100%;max-width:900px;height:120px;background:${b.brandColor};border-radius:20px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;margin-top:8px">
    <span style="font-size:42px;font-weight:700;color:#ffffff">${esc(cta)}</span>
    <span style="font-size:22px;font-weight:500;color:rgba(255,255,255,0.7)">${esc(b.signupUrl)}</span>
  </div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN 5: PHOTO — custom background, frosted glass card, everything inside
// ═══════════════════════════════════════════════════════════════════════════

function shellPhoto(b: BrandContext, heroHtml: string, bgImageUrl?: string | null): string {
  const s = t(b.language)
  const cta = resolveCopy(b, 'cta_text', s.tapToJoin)
  const bgEl = bgImageUrl
    ? `<img src="${esc(bgImageUrl)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" crossorigin="anonymous">`
    : `<div style="position:absolute;inset:0;background:linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)"></div>`

  const logo = b.logoUrl
    ? `<img src="${esc(b.logoUrl)}" style="height:56px;object-fit:contain" crossorigin="anonymous">`
    : `<span style="font-size:32px;font-weight:700;color:#ffffff;letter-spacing:0.1em;text-transform:uppercase">${esc(b.studioName)}</span>`

  return `${head()}
<body style="width:1080px;height:1920px;position:relative;overflow:hidden;font-family:'Poppins',sans-serif;color:#ffffff">
${bgEl}
<div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.65) 100%);pointer-events:none"></div>
<div style="position:absolute;top:260px;left:44px;right:44px;bottom:50px;background:rgba(0,0,0,0.25);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:36px;display:flex;flex-direction:column;padding:48px 44px">
  <div style="display:flex;justify-content:center;margin-bottom:24px">${logo}</div>
  <div style="width:60px;height:2px;background:rgba(255,255,255,0.15);margin:0 auto 24px"></div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 8px">${heroHtml}</div>
  <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;display:flex;flex-direction:column;align-items:center;gap:20px">
    <div style="display:flex;gap:16px">
      <span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:10px 24px;font-size:24px;font-weight:500;opacity:0.7">${esc(s.noApp)}</span>
      <span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:10px 24px;font-size:24px;font-weight:500;opacity:0.7">${esc(s.freeToJoin)}</span>
      <span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:10px 24px;font-size:24px;font-weight:500;opacity:0.7">${esc(s.walletCard)}</span>
    </div>
    <div style="width:100%;height:100px;background:${b.brandColor};border-radius:18px;display:flex;align-items:center;justify-content:space-between;padding:0 40px">
      <span style="font-size:38px;font-weight:700;color:#ffffff">${esc(cta)}</span>
      <span style="font-size:20px;font-weight:500;color:rgba(255,255,255,0.7)">${esc(b.signupUrl)}</span>
    </div>
  </div>
</div>
</body></html>`
}

// ─── Public API ─────────────────────────────────────────────────────────

type ShellBuilder = (b: BrandContext, heroHtml: string, bgImageUrl?: string | null) => string

const SHELL_BUILDERS: Record<string, ShellBuilder> = {
  minimal: shellMinimal,
  neon: shellNeon,
  editorial: shellEditorial,
  bold: shellBold,
  photo: shellPhoto,
}

export function buildStoryHtml(
  storyTypeId: string,
  designStyleId: string,
  brand: BrandContext,
  bgImageUrl?: string | null
): string {
  const shell = SHELL_BUILDERS[designStyleId] ?? shellMinimal
  const hero = HERO_BUILDERS[storyTypeId] ?? heroReward

  // Bold + Photo: white accent. Others: brand color.
  const accent = designStyleId === 'bold' || designStyleId === 'photo' ? '#ffffff' : brand.brandColor
  // Editorial: left-aligned. Others: centered.
  const align: Align = designStyleId === 'editorial' ? 'left' : 'center'

  return shell(brand, hero(brand, accent, align), bgImageUrl)
}

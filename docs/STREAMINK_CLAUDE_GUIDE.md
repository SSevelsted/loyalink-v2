# Loyalink Integration Guide for StreamInk Claude Code

> Copy this into your StreamInk Claude Code context (e.g. CLAUDE.md or paste directly) so it knows how to integrate with Loyalink.

---

## What is Loyalink?

Loyalink is our loyalty program platform. Every StreamInk client gets a Loyalink studio automatically. It handles:
- Digital wallet passes (Apple + Google Wallet)
- Cashback tiers (Base 7.5% → Loyalty Club 15% → Inner Circle 20%)
- Referral program with welcome bonuses
- Promotions (temporary cashback boosts or tier overrides)
- Customer-facing join page + loyalty hub

StreamInk communicates with Loyalink via REST API. The Loyalink dashboard can also be embedded in an iframe.

---

## Authentication

```
Authorization: Bearer <key>
```

Two key types:
- **Master key** (`LOYALINK_MASTER_API_KEY` env var): Used to create new studios. Store this server-side only.
- **Studio key** (`lk_live_...`): Scoped to one studio. Used for all other operations. Generated when you need one via the API key management endpoint, or manually in the Loyalink dashboard.

Base URL: `https://my.loyalink.ai`

---

## 1. Creating a Studio (Client Onboarding)

When a new client signs up on StreamInk, create their Loyalink studio:

```typescript
const res = await fetch('https://my.loyalink.ai/api/v1/studios', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.LOYALINK_MASTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: clientName,           // Required — business name
    email: clientEmail,         // Optional
    phone: clientPhone,         // Optional
    currency: 'DKK',           // 'DKK' | 'EUR' | 'SEK' | 'NOK' | 'USD' | 'GBP'
    language: 'da',            // 'en' | 'da' | 'sv' | 'no' | 'de' | 'fr' | 'es'
    streamink_workspace_id: workspaceId,  // Your internal workspace ID for linking
  }),
})

const { data: studio } = await res.json()
// studio.id   → UUID — store this, it's the main identifier
// studio.slug → URL-safe name, used in join link: loyalink.ai/join/{slug}
```

**What this creates automatically:**
- Studio with StreamInk rewards template (3 tiers + referrals)
- Default wallet card design (customized manually later)
- Landing page at `loyalink.ai/join/{slug}`
- Two promotion templates: "Cashback Boost 20%" and "Inner Circle 1 year"
- Welcome bonus for referred friends based on currency (€15 / 100 DKK / 150 SEK / 150 NOK)

**Store in your database:** `studio.id` (UUID) linked to the StreamInk workspace.

---

## 2. Managing Members

### Create a member (when a lead joins the loyalty program)
```typescript
const res = await fetch('https://my.loyalink.ai/api/v1/members', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${studioApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',    // Optional, must be unique per studio
    phone: '+45 12 34 56 78',     // Optional, must be unique per studio
    platform: 'apple',            // 'apple' or 'google' — wallet pass platform
    referral_code: 'ABC12345',    // Optional — existing member's referral code
  }),
})

const { data } = await res.json()
// data.customerId → UUID of the new member
// data.passUrl    → Download URL for their wallet pass
// data.customerAccessToken → Short-lived token for member-facing pages
```

### Search members
```
GET /api/v1/members/search?q=john
```

### Get single member
```
GET /api/v1/members/{id}
```

### List members (paginated)
```
GET /api/v1/members?limit=50&offset=0&search=john&tier=loyalty_club&sort=created_at&order=desc
```

### Update member info
```
PATCH /api/v1/members/{id}
Body: { "name": "...", "email": "...", "phone": "...", "tags": [...], "metadata": {...} }
```

---

## 3. Processing Transactions

**This is the most important endpoint.** Call it when a client's customer makes a purchase.

```typescript
const res = await fetch('https://my.loyalink.ai/api/v1/transactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${studioApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customer_id: memberId,
    amount: 500,              // Total transaction amount
    cash_amount: 400,         // Optional — cash paid (if they used loyalty balance for part)
    is_deposit: false,        // Optional — true if this is a deposit, not a full payment
  }),
})

const { data } = await res.json()
// data.summary.tierUpgraded    → boolean
// data.summary.cashbackEarned  → number
// data.summary.newBalance      → number
// data.summary.currentTier     → { slug, name, cashbackRate }
// data.summary.nextTier        → { slug, name, trigger, progress } or null
```

**This automatically handles:**
- Tier upgrades (Base → Loyalty Club on first full payment)
- Cashback calculation and crediting
- Referral activation + commission
- Active promotion rate override + expiry
- Wallet pass push updates

### `is_deposit` matters!
- `is_deposit: true` → Does NOT trigger "first_full_payment" tier upgrade. Customer stays in Base tier.
- `is_deposit: false` (or omitted) → Triggers tier upgrade to Loyalty Club if it's their first full payment.

### `cash_amount` for partial balance usage
If a customer pays 500 kr but uses 100 kr from their loyalty balance:
```json
{ "amount": 500, "cash_amount": 400 }
```
Cashback is only calculated on the cash portion (400 kr), not the balance portion.

---

## 4. Adjusting Balances Directly

```typescript
// Credit balance
await fetch(`https://my.loyalink.ai/api/v1/members/${id}/balance`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'credit', amount: 50, description: 'Manual adjustment' }),
})

// Debit balance
await fetch(`https://my.loyalink.ai/api/v1/members/${id}/balance`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'debit', amount: 50, description: 'Balance redemption' }),
})
```

---

## 5. Promotions

Two pre-created promotion templates exist per studio:

### Apply "20% cashback on next transaction"
```typescript
// First, get the promotion templates
const res = await fetch('https://my.loyalink.ai/api/v1/promotions', {
  headers: { 'Authorization': `Bearer ${key}` },
})
const { data: templates } = await res.json()
const boostTemplate = templates.find(t => t.type === 'cashback_boost')

// Apply to a member
await fetch(`https://my.loyalink.ai/api/v1/members/${memberId}/promotions`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ promotion_id: boostTemplate.id }),
})
```

### Apply "Inner Circle for 1 year"
```typescript
const innerCircleTemplate = templates.find(t => t.type === 'tier_override')

await fetch(`https://my.loyalink.ai/api/v1/members/${memberId}/promotions`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ promotion_id: innerCircleTemplate.id }),
})
```

### Apply custom promotion (no template)
```typescript
await fetch(`https://my.loyalink.ai/api/v1/members/${memberId}/promotions`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'cashback_boost',
    cashback_rate: 25,
    duration_type: 'days',
    duration_value: 30,
  }),
})
```

### Revoke active promotion
```
DELETE /api/v1/members/{id}/promotions
```

**Rules:**
- Only one active promotion per member
- Returns `409` if member already has one — revoke first
- Usage-limited promotions auto-expire after the transaction
- Time-limited promotions auto-expire on next transaction after the date passes

---

## 6. Reading Stats

```
GET /api/v1/stats?from_date=2026-01-01&to_date=2026-04-09
```

Returns: `total_revenue`, `active_customers`, `total_customers`, `avg_transaction_value`, `total_transactions`, `outstanding_balance`, `tier_distribution`, `currency`.

---

## 7. Embedding the Loyalink Dashboard

To show the Loyalink UI inside StreamInk without the user leaving:

```typescript
// Step 1: Generate embed token (server-side)
const res = await fetch('https://my.loyalink.ai/api/v1/embed-token', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${studioApiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ ttl_seconds: 3600 }),
})
const { data } = await res.json()

// Step 2: Render iframe (client-side)
// data.embed_url → "/embed/{studioId}?token=..."
const iframeSrc = `https://my.loyalink.ai${data.embed_url}`
```

```html
<iframe src="{iframeSrc}" style="width:100%;height:100%;border:none;" allow="clipboard-write" />
```

Available pages (append to embed URL):
- `/embed/{id}?token=...` — Overview
- `/embed/{id}/customers?token=...` — Customer list
- `/embed/{id}/transactions?token=...` — Transaction history
- `/embed/{id}/analytics?token=...` — Stats
- `/embed/{id}/wallet?token=...` — Wallet & join link
- `/embed/{id}/settings?token=...` — Studio settings (read-only)

Tokens expire after TTL (default 1h, max 24h). Refresh before expiry.

---

## 8. Tier System Reference

| Tier | Slug | Cashback | How to reach |
|------|------|----------|--------------|
| Base | `base` | 7.5% | Default on signup |
| Loyalty Club | `loyalty_club` | 15% | First full payment (not deposit) |
| Inner Circle | `inner_circle` | 20% | Promotion only (never automatic) |

**Referral program:**
- Referrer gets +2.5% cashback per successful referral (cap: 25%)
- Referral activates when the referred person pays any deposit
- Referred friend starts in Loyalty Club (15%) with welcome bonus

---

## 9. Environment Variables Needed in StreamInk

```env
LOYALINK_MASTER_API_KEY=<master key for creating studios>
LOYALINK_API_URL=https://my.loyalink.ai
```

Per studio, store in your database:
- `loyalink_studio_id` (UUID)
- `loyalink_api_key` (lk_live_... — generate via Settings > API in Loyalink, or build an API key creation flow)

---

## 10. Typical Integration Points in StreamInk

| StreamInk event | Loyalink API call |
|----------------|-------------------|
| Client signs up | `POST /api/v1/studios` |
| Lead joins loyalty program | `POST /api/v1/members` |
| Lead makes a purchase/payment | `POST /api/v1/transactions` |
| Lead books consultation (incentive) | `POST /api/v1/members/{id}/promotions` |
| Loyal client reward | `POST /api/v1/members/{id}/promotions` (Inner Circle 1yr) |
| Show loyalty stats in dashboard | `GET /api/v1/stats` |
| Embed full loyalty dashboard | `POST /api/v1/embed-token` → iframe |
| Client leaves StreamInk | `PATCH /api/v1/studios/{id}` → set source to 'loyalink' |
| Look up a lead's loyalty info | `GET /api/v1/members/search?q=...` or `GET /api/v1/members/{id}` |

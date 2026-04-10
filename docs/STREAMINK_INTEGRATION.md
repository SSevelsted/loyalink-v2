# Loyalink API Integration Guide

> For StreamInk platform integration. Base URL: `https://my.loyalink.ai`

---

## Overview

Loyalink exposes a REST API that lets StreamInk:

1. **Create loyalty programs** for clients (skip the onboarding wizard)
2. **Manage members** — create, search, adjust balances, change tiers
3. **Process transactions** — with automatic cashback, tier upgrades, and referral commissions
4. **Read stats** — revenue, active customers, tier distribution
5. **Embed the dashboard** — iframe the Loyalink UI inside StreamInk

---

## Authentication

All API calls use Bearer token authentication:

```
Authorization: Bearer lk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

There are two types of keys:

| Key type | Purpose | How to get |
|----------|---------|------------|
| **Master key** | Create new studios | Set as `LOYALINK_MASTER_API_KEY` env var on Loyalink |
| **Studio key** | All other operations (scoped to one studio) | Generated in Loyalink Settings > API, or returned when creating a studio |

---

## Quick Start: Onboard a Client

```bash
# 1. Create a studio for your client
curl -X POST https://my.loyalink.ai/api/v1/studios \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coffee House",
    "email": "owner@coffeehouse.com",
    "phone": "+45 12 34 56 78",
    "currency": "DKK",
    "language": "da",
    "streamink_workspace_id": "ws_abc123"
  }'

# Response: { "data": { "id": "uuid", "slug": "coffee-house", ... } }

# 2. Create an API key for this studio (do this from Loyalink Settings > API,
#    or programmatically via the master key + studio management)
```

The studio is immediately live with:
- Default rewards program (4 tiers, referral program)
- Default wallet card design
- Landing page at `loyalink.ai/join/coffee-house`
- No Stripe subscription (StreamInk handles billing)

---

## API Reference

### Response Format

All responses follow this format:

```json
// Success
{ "data": { ... } }

// Success (paginated)
{ "data": [...], "pagination": { "total": 100, "limit": 50, "offset": 0, "has_more": true } }

// Error
{ "error": "Human-readable error message" }
```

HTTP status codes: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `500` Server Error.

---

### Studios

#### Create Studio
```
POST /api/v1/studios
Auth: Master key
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | Yes | — |
| `email` | string | No | — |
| `phone` | string | No | — |
| `address` | object | No | — |
| `currency` | string | No | `"DKK"` |
| `language` | string | No | `"en"` |
| `streamink_workspace_id` | string | No | — |

**Response:** Full studio object with `id`, `slug`, `settings`, etc.

The created studio has `subscription_status: "agency"` and `onboarding_completed: true`.

---

#### Get Studio
```
GET /api/v1/studios/:id
Auth: Studio key or master key
```

**Response:** Full studio object.

---

#### Update Studio
```
PATCH /api/v1/studios/:id
Auth: Studio key or master key
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | New studio name |
| `settings` | object | Merged with existing settings (does not replace) |

---

#### Delete Studio (soft)
```
DELETE /api/v1/studios/:id
Auth: Studio key or master key
```

Sets `subscription_status` to `"cancelled"`. Data is preserved.

---

#### Get Rewards Config
```
GET /api/v1/studios/:id/rewards-config
Auth: Studio key or master key
```

**Response:** The studio's rewards configuration (tiers, referral settings, cashback rates).

---

#### Update Rewards Config
```
PATCH /api/v1/studios/:id/rewards-config
Auth: Studio key or master key
```

Send the full `RewardsConfig` object. Must include a `tiers` array.

---

### Members

#### List Members
```
GET /api/v1/members
Auth: Studio key
```

| Query Param | Type | Default | Notes |
|-------------|------|---------|-------|
| `limit` | number | 50 | Max 200 |
| `offset` | number | 0 | |
| `search` | string | — | Searches name, email, phone |
| `tier` | string | — | Filter by tier slug |
| `has_purchased` | string | — | `"true"` or `"false"` |
| `sort` | string | `"created_at"` | Also: `"balance"`, `"total_real_spend"`, `"name"` |
| `order` | string | `"desc"` | `"asc"` or `"desc"` |

**Response:** Paginated array of member objects.

---

#### Create Member
```
POST /api/v1/members
Auth: Studio key
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | |
| `email` | string | No | Must be unique per studio |
| `phone` | string | No | Must be unique per studio |
| `platform` | string | No | `"apple"` (default) or `"google"` — wallet pass platform |
| `referral_code` | string | No | Existing member's referral code |
| `custom_fields` | object | No | Stored in metadata |

**Response:**
```json
{
  "data": {
    "customerId": "uuid",
    "passUrl": "https://...",
    "customerAccessToken": "..."
  }
}
```

This automatically:
- Creates the member with a referral code
- Generates a wallet pass (Apple/Google)
- Processes referral bonuses if a referral code is provided
- Returns a pass download URL

Returns `409` if email or phone already exists in this studio.

---

#### Get Member
```
GET /api/v1/members/:id
Auth: Studio key
```

**Response:** Full member object including `balance`, `loyalty_stage`, `cashback_rate`, `referral_code`, `total_real_spend`, `tags`, `metadata`.

---

#### Update Member
```
PATCH /api/v1/members/:id
Auth: Studio key
```

Allowed fields: `name`, `email`, `phone`, `tags`, `metadata`.

---

#### Get Member Referrals
```
GET /api/v1/members/:id/referrals
Auth: Studio key
```

**Response:**
```json
{
  "data": {
    "referral_code": "ABC12345",
    "referral_count": 3,
    "referred_by": null,
    "referred_friends": [
      {
        "id": "referral-uuid",
        "friend": {
          "id": "customer-uuid",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "has_purchased": true
        },
        "status": "activated",
        "activated_at": "2026-04-01T...",
        "commission_expires_at": "2026-06-01T...",
        "total_commission_earned": 125.00,
        "created_at": "2026-03-15T..."
      },
      {
        "id": "referral-uuid-2",
        "friend": {
          "id": "customer-uuid-2",
          "name": "Bob Jones",
          "email": "bob@example.com",
          "has_purchased": false
        },
        "status": "pending",
        "activated_at": null,
        "commission_expires_at": null,
        "total_commission_earned": 0,
        "created_at": "2026-04-05T..."
      }
    ]
  }
}
```

For each referred friend: `has_purchased` indicates whether they've made their first purchase, and `status` shows `"pending"` (signed up but not activated) or `"activated"` (met the activation trigger, e.g. first purchase).

If this member was themselves referred, `referred_by` contains the referrer's info.

---

#### Search Members
```
GET /api/v1/members/search?q=john
Auth: Studio key
```

Returns up to 20 matches. Query must be at least 2 characters. Searches name, email, and phone.

---

#### Adjust Balance
```
PATCH /api/v1/members/:id/balance
Auth: Studio key
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | string | Yes | `"credit"` or `"debit"` |
| `amount` | number | Yes | Positive number |
| `description` | string | No | Shown in transaction history |

**Response:** `{ "data": { "balance": 150.00 } }`

Returns `400` if debit would result in negative balance.

---

#### Change Tier
```
PATCH /api/v1/members/:id/tier
Auth: Studio key
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tier_slug` | string | Yes | Must exist in studio's rewards config |
| `cashback_rate` | number | No | Overrides the tier's default rate |

Returns `400` if tier slug doesn't exist in the rewards config.

---

### Transactions

#### Process Transaction
```
POST /api/v1/transactions
Auth: Studio key
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `customer_id` | string | Yes | |
| `amount` | number | Yes | Total transaction amount |
| `cash_amount` | number | No | Cash portion (if partial balance redemption) |
| `is_deposit` | boolean | No | If true, doesn't count as "full payment" for tier triggers |

**This is the core endpoint.** It automatically:
- Updates the member's total spend
- Checks and applies tier upgrades
- **Checks for active promotions** — uses promo cashback rate if active
- Calculates and credits cashback
- Activates referrals if conditions are met
- Credits referral commissions to referrers
- **Expires usage-limited promotions** and reverts member to original tier/rate
- Pushes updates to wallet passes

**Response:**
```json
{
  "data": {
    "success": true,
    "results": ["Upgraded to gold at 15%", "Cashback: 7.50 kr (7.5%)"],
    "summary": {
      "tierUpgraded": true,
      "previousTier": { "slug": "silver", "name": "Base (Silver)", "cashbackRate": 7.5 },
      "currentTier": { "slug": "gold", "name": "Loyalty Club (Gold)", "cashbackRate": 15, "index": 1 },
      "nextTier": { "slug": "black", "name": "Referrals (Black)", "cashbackRate": 17.5, "trigger": {...}, "progress": null },
      "cashbackEarned": 7.50,
      "cashbackRate": 7.5,
      "newBalance": 107.50,
      "totalSpend": 500,
      "isMaxTier": false
    }
  }
}
```

---

#### List Transactions
```
GET /api/v1/transactions
Auth: Studio key
```

| Query Param | Type | Default | Notes |
|-------------|------|---------|-------|
| `limit` | number | 50 | Max 200 |
| `offset` | number | 0 | |
| `customer_id` | string | — | Filter by member |
| `type` | string | — | `"credit"`, `"debit"`, `"cashback"`, `"adjustment"`, `"referral_commission"` |
| `from_date` | string | — | ISO datetime |
| `to_date` | string | — | ISO datetime |

---

### Stats

#### Get Studio Stats
```
GET /api/v1/stats
Auth: Studio key
```

| Query Param | Type | Default |
|-------------|------|---------|
| `from_date` | string | 30 days ago |
| `to_date` | string | Now |
| `tier` | string | — |

**Response:**
```json
{
  "data": {
    "period": { "from": "2026-03-10T...", "to": "2026-04-09T..." },
    "kpis": {
      "total_revenue": 45000,
      "active_customers": 120,
      "total_customers": 350,
      "avg_transaction_value": 375,
      "total_transactions": 120,
      "outstanding_balance": 8500.50
    },
    "tier_distribution": [
      { "tier": "silver", "count": 200 },
      { "tier": "gold", "count": 100 },
      { "tier": "black", "count": 35 },
      { "tier": "platinum", "count": 15 }
    ],
    "currency": "DKK"
  }
}
```

---

### Promotions

Promotions let you apply temporary cashback boosts or tier overrides to specific members. They auto-expire by usage count or time.

#### Create Promotion Template
```
POST /api/v1/promotions
Auth: Studio key
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | e.g. "Consultation Bonus" |
| `type` | string | Yes | `"cashback_boost"` or `"tier_override"` |
| `cashback_rate` | number | If cashback_boost | e.g. 20 |
| `tier_slug` | string | If tier_override | e.g. "platinum" |
| `duration_type` | string | Yes | `"transactions"`, `"days"`, or `"unlimited"` |
| `duration_value` | number | No | Default 1. e.g. 1 transaction, 365 days |

---

#### List Promotion Templates
```
GET /api/v1/promotions
Auth: Studio key
```

Returns active promotion templates for this studio.

---

#### Apply Promotion to Member
```
POST /api/v1/members/:id/promotions
Auth: Studio key
```

**Option A: Apply a template**
```json
{ "promotion_id": "uuid" }
```

**Option B: Apply a custom promotion (no template)**
```json
{
  "type": "cashback_boost",
  "cashback_rate": 20,
  "duration_type": "transactions",
  "duration_value": 1
}
```

Only one active promotion per member. Returns `409` if member already has one.

**What happens:**
- `cashback_boost`: Member's cashback rate is immediately updated. On next transaction(s), the boosted rate is used. When the promotion expires (usage or time), the member reverts to their original rate.
- `tier_override`: Member is immediately moved to the specified tier (with new card design, pass colors). When it expires, they revert to their original tier.

---

#### List Member's Promotions
```
GET /api/v1/members/:id/promotions
Auth: Studio key
```

Returns all promotions (active, expired, revoked) for this member.

---

#### Revoke Active Promotion
```
DELETE /api/v1/members/:id/promotions
Auth: Studio key
```

Immediately revokes the active promotion and reverts the member to their original tier/rate.

---

#### Example Flows

**"Book consultation, get 20% on next purchase":**
```bash
# Create template (once)
curl -X POST .../api/v1/promotions \
  -H "Authorization: Bearer $KEY" \
  -d '{ "name": "Consultation Bonus", "type": "cashback_boost", "cashback_rate": 20, "duration_type": "transactions", "duration_value": 1 }'

# Apply to member (when they book)
curl -X POST .../api/v1/members/{id}/promotions \
  -H "Authorization: Bearer $KEY" \
  -d '{ "promotion_id": "template-uuid" }'

# Next transaction auto-uses 20%, then reverts
```

**"VIP for 1 year":**
```bash
curl -X POST .../api/v1/members/{id}/promotions \
  -H "Authorization: Bearer $KEY" \
  -d '{ "type": "tier_override", "tier_slug": "platinum", "duration_type": "days", "duration_value": 365 }'
```

---

## Embedding the Dashboard

StreamInk can embed the Loyalink dashboard in an iframe.

### Step 1: Generate an embed token

```bash
curl -X POST https://my.loyalink.ai/api/v1/embed-token \
  -H "Authorization: Bearer $STUDIO_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "ttl_seconds": 3600 }'
```

**Response:**
```json
{
  "data": {
    "token": "eyJ...",
    "expires_in": 3600,
    "embed_url": "/embed/studio-uuid?token=eyJ..."
  }
}
```

### Step 2: Render the iframe

```html
<iframe
  src="https://my.loyalink.ai/embed/{studioId}?token={token}"
  style="width: 100%; height: 100%; border: none;"
  allow="clipboard-write"
/>
```

### Available embed pages

| Page | URL |
|------|-----|
| Overview | `/embed/{studioId}?token=...` |
| Customers | `/embed/{studioId}/customers?token=...` |
| Transactions | `/embed/{studioId}/transactions?token=...` |
| Analytics | `/embed/{studioId}/analytics?token=...` |
| Wallet & Landing Page | `/embed/{studioId}/wallet?token=...` |
| Notifications | `/embed/{studioId}/notifications?token=...` |
| Settings | `/embed/{studioId}/settings?token=...` |

### postMessage events

The embed sends messages to the parent window:

```js
// Embed is loaded and ready
{ type: "loyalink:ready", studioId: "uuid" }

// User navigated within the embed
{ type: "loyalink:route", pathname: "/embed/uuid/customers" }
```

### Token refresh

Tokens expire after the specified TTL (default 1 hour, max 24 hours). Generate a new token before expiry and update the iframe `src`.

---

## Downsell Flow

When a StreamInk client cancels, their Loyalink studio already has all data (members, transactions, wallet passes, landing page). To transition them to standalone Loyalink:

1. Update the studio source:
   ```bash
   PATCH /api/v1/studios/:id
   { "settings": { "source": "loyalink" } }
   ```

2. The client signs up at `loyalink.ai` with the same email — they'll see their existing studio with all data intact. They just need to add billing.

3. Their end-customers experience zero disruption — same wallet passes, same join link, same everything.

---

## Typical Integration Flow

```
StreamInk Client Signs Up
        │
        ▼
StreamInk calls POST /api/v1/studios
        │
        ▼
Studio created with defaults ─────────► Join link live: loyalink.ai/join/{slug}
        │
        ▼
StreamInk stores studio_id + generates API key
        │
        ├──► Embed: POST /api/v1/embed-token → iframe
        │         Client customizes card design, landing page
        │
        ├──► API: POST /api/v1/members
        │         Import existing customers
        │
        ├──► API: POST /api/v1/transactions
        │         Process purchases, auto-cashback + tier upgrades
        │
        ├──► API: GET /api/v1/stats
        │         Show loyalty metrics in StreamInk dashboard
        │
        ├──► Webhooks: Register endpoint in Settings > Webhooks
        │         Receive real-time balance, tier, and member updates
        │
        ▼
Client leaves StreamInk?
        │
        ▼
PATCH /api/v1/studios/:id { "settings": { "source": "loyalink" } }
        │
        ▼
Client logs into loyalink.ai → adds billing → continues independently
```

---

## Webhooks

Instead of polling the API for changes, you can register a webhook to receive real-time push notifications when events happen in a studio's loyalty program.

### Setup via API

Register a webhook programmatically right after creating a studio:

```bash
curl -X POST https://my.loyalink.ai/api/v1/studios/{studioId}/webhooks \
  -H "Authorization: Bearer $STUDIO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.streamink.co/webhooks/loyalink",
    "events": ["balance.updated", "tier.upgraded", "member.created"]
  }'

# Response (201):
# {
#   "data": {
#     "id": "uuid",
#     "url": "https://api.streamink.co/webhooks/loyalink",
#     "events": ["balance.updated", "tier.upgraded", "member.created"],
#     "active": true,
#     "secret": "whsec_..."   <-- store this, shown only once
#   }
# }
```

#### Manage Webhooks

```
GET    /api/v1/studios/:id/webhooks              # List all webhooks
POST   /api/v1/studios/:id/webhooks              # Create webhook (returns secret once)
PATCH  /api/v1/studios/:id/webhooks/:webhookId   # Update URL, events, or active status
DELETE /api/v1/studios/:id/webhooks/:webhookId   # Delete webhook
```

Auth: Studio key or master key.

Webhooks can also be managed manually in **Settings > Webhooks** in the dashboard.

Each webhook gets:

- **Endpoint URL** — must be HTTPS
- **Signing secret** — shown once on creation (format: `whsec_...`)
- **Event filter** — subscribe to specific events, or leave empty for all

### Events

| Event | Fired when |
|-------|-----------|
| `member.created` | A new customer joins the loyalty program |
| `transaction.created` | A transaction is processed |
| `balance.updated` | A customer's balance changes (cashback credited) |
| `tier.upgraded` | A customer moves up a tier |
| `referral.activated` | A referral converts (referred friend meets activation trigger) |
| `promotion.expired` | A promotion expires (time or usage limit) |

### Payload Format

```json
{
  "event": "balance.updated",
  "studio_id": "uuid",
  "customer_id": "uuid",
  "data": {
    "new_balance": 245.50,
    "cashback_earned": 15.00,
    "cashback_rate": 7.5,
    "promotion_applied": false
  },
  "timestamp": "2026-04-10T14:30:00.000Z"
}
```

### Verifying Signatures

Every request includes an `X-Loyalink-Signature` header containing an HMAC-SHA256 hex digest of the raw request body, signed with your webhook secret.

```javascript
import { createHmac } from 'crypto'

function verifySignature(body, signature, secret) {
  const expected = createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return expected === signature
}

// In your handler:
app.post('/webhooks/loyalink', (req, res) => {
  const sig = req.headers['x-loyalink-signature']
  if (!verifySignature(req.rawBody, sig, process.env.LOYALINK_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature')
  }

  const { event, customer_id, data } = req.body

  switch (event) {
    case 'balance.updated':
      // Update customer's loyalty balance in your system
      break
    case 'tier.upgraded':
      // Reflect new tier in your UI
      break
    case 'member.created':
      // Sync new member to your CRM
      break
  }

  res.status(200).send('OK')
})
```

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Loyalink-Signature` | HMAC-SHA256 hex digest |
| `X-Loyalink-Event` | Event type (e.g. `balance.updated`) |

### Retry Policy

- Timeout: 10 seconds per delivery
- 1 automatic retry after 3 seconds on failure
- Delivery history is visible in Settings > Webhooks (last 50 deliveries per endpoint, kept for 30 days)

### Example: Keeping Customer Balances in Sync

Instead of polling `GET /api/v1/members/:id` after every transaction, subscribe to `balance.updated`:

```
Before (polling):
  StreamInk → POST /api/v1/transactions  →  wait  →  GET /api/v1/members/:id  →  update UI

After (webhook):
  StreamInk → POST /api/v1/transactions
  Loyalink  → POST https://api.streamink.co/webhooks/loyalink  { event: "balance.updated", ... }
  StreamInk → update UI immediately
```

---

## Rate Limits

No hard rate limits in V1. Be reasonable. If you need to bulk-import members, batch them with short delays between requests.

---

## Questions?

Reach out to the Loyalink team at `hello@loyalink.ai`.

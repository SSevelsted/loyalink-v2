// One-off verification: confirm PUT /members/member/points/set triggers a pass push.
// Mirrors the JWT signing in src/lib/services/passkit-rest-service.ts. Safe: sets the
// member's CURRENT balance (idempotent value) and checks passMetaData.lastUpdatedAt advances.
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(process.argv[2] || '.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    })
)

const apiKey = env.PASSKIT_API_KEY
const apiSecret = env.PASSKIT_API_SECRET
const apiPrefix = (env.PASSKIT_API_PREFIX || 'https://api.pub1.passkit.io').replace(/\/+$/, '')
const MEMBER_ID = '1i3htxda2Syogr1NMJzqHR'

if (!apiKey || !apiSecret) {
  console.error('Missing PASSKIT_API_KEY / PASSKIT_API_SECRET in .env.local')
  process.exit(1)
}

const b64url = (v) =>
  Buffer.from(JSON.stringify(v)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

function jwt() {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url({ alg: 'HS256', typ: 'JWT' })
  const payload = b64url({ uid: apiKey, iat: now, exp: now + 1800 })
  const sig = createHmac('sha256', apiSecret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${header}.${payload}.${sig}`
}

async function pk(path, init = {}) {
  const headers = { Authorization: jwt(), Accept: 'application/json' }
  if (init.body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${apiPrefix}${path}`, { ...init, headers, cache: 'no-store' })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }
  return { ok: res.ok, status: res.status, body }
}

const summarize = (m) => ({
  points: m?.points,
  lastUpdatedAt: m?.passMetaData?.lastUpdatedAt ?? null,
  updated: m?.updated,
})

const before = await pk(`/members/member/id/${encodeURIComponent(MEMBER_ID)}`)
console.log('BEFORE:', JSON.stringify(summarize(before.body)))

const points = typeof before.body?.points === 'number' ? before.body.points : 0
const set = await pk('/members/member/points/set', {
  method: 'PUT',
  body: JSON.stringify({ id: MEMBER_ID, points }),
})
console.log(`SET /members/member/points/set -> HTTP ${set.status}`, set.ok ? 'OK' : JSON.stringify(set.body))

// brief poll for the push timestamp to land
let after
for (let i = 0; i < 5; i++) {
  after = await pk(`/members/member/id/${encodeURIComponent(MEMBER_ID)}`)
  if (after.body?.passMetaData?.lastUpdatedAt) break
  await new Promise((r) => setTimeout(r, 1500))
}
console.log('AFTER :', JSON.stringify(summarize(after.body)))

const beforeStamp = before.body?.passMetaData?.lastUpdatedAt ?? null
const afterStamp = after.body?.passMetaData?.lastUpdatedAt ?? null
const advanced = afterStamp && afterStamp !== beforeStamp
console.log('\nRESULT:', set.ok && advanced
  ? '✅ setPoints accepted AND pass push fired (lastUpdatedAt advanced)'
  : set.ok
    ? '⚠️ setPoints accepted but lastUpdatedAt did not advance yet'
    : '❌ setPoints endpoint rejected the request')

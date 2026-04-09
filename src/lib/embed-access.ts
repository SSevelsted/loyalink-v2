import crypto from 'crypto'

type EmbedAccessPayload = {
  studioId: string
  scope: 'embed_access'
  exp: number
}

function getSigningSecret(): string {
  const secret =
    process.env.EMBED_ACCESS_SECRET ||
    process.env.CUSTOMER_ACCESS_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error('A signing secret is required for embed access tokens')
  }

  return secret
}

function sign(value: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(value)
    .digest('base64url')
}

export function createEmbedToken(studioId: string, ttlSeconds = 60 * 60): string {
  const payload: EmbedAccessPayload = {
    studioId,
    scope: 'embed_access',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyEmbedToken(token: string | null | undefined): EmbedAccessPayload | null {
  if (!token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expected = sign(encodedPayload)
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)

  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as EmbedAccessPayload

    if (payload.scope !== 'embed_access') return null
    if (!payload.studioId) return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

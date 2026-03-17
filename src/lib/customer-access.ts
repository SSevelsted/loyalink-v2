import crypto from 'crypto'

type CustomerAccessPayload = {
  customerId: string
  scope: 'customer_access'
  exp: number
}

function getSigningSecret(): string {
  const secret =
    process.env.CUSTOMER_ACCESS_SECRET ||
    process.env.PASS_SERVICE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error('A signing secret is required for customer access tokens')
  }

  return secret
}

function sign(value: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(value)
    .digest('base64url')
}

export function createCustomerAccessToken(customerId: string, ttlSeconds = 60 * 60): string {
  const payload: CustomerAccessPayload = {
    customerId,
    scope: 'customer_access',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyCustomerAccessToken(token: string | null | undefined): CustomerAccessPayload | null {
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
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as CustomerAccessPayload

    if (payload.scope !== 'customer_access') return null
    if (!payload.customerId) return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue?.startsWith('Bearer ')) return null
  return headerValue.slice('Bearer '.length).trim() || null
}

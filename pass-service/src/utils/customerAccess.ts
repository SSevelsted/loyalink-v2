import crypto from 'crypto'

type CustomerAccessPayload = {
  customerId: string
  scope: 'customer_access'
  exp: number
}

function getSigningSecret(): string {
  const secret = process.env.CUSTOMER_ACCESS_SECRET
  if (!secret) {
    throw new Error('CUSTOMER_ACCESS_SECRET environment variable is required')
  }
  return secret
}

function sign(value: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(value)
    .digest('base64url')
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

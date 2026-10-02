import crypto from 'crypto'

type CustomerAccessPayload = {
  customerId: string
  scope: 'customer_access'
  exp: number
  /**
   * Set on the token the public /loyalty page hands to a visitor who came
   * without a token. It can add the wallet pass (generate + download) and
   * nothing else: it never opens the member's balance, activity or friends.
   * The pass-service checks only scope, customerId and exp, so it accepts it.
   */
  pass_only?: true
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

export function createCustomerAccessToken(
  customerId: string,
  ttlSeconds = 60 * 60,
  options: { passOnly?: boolean } = {},
): string {
  const payload: CustomerAccessPayload = {
    customerId,
    scope: 'customer_access',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    ...(options.passOnly ? { pass_only: true as const } : {}),
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

/**
 * Does this token open the member's personal data (balance, activity,
 * friends)? It must be valid, belong to this customer, and not be pass-only.
 */
export function hasPersonalDataAccess(token: string | null | undefined, customerId: string): boolean {
  const payload = verifyCustomerAccessToken(token)
  return !!payload && payload.customerId === customerId && !payload.pass_only
}

export function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue?.startsWith('Bearer ')) return null
  return headerValue.slice('Bearer '.length).trim() || null
}

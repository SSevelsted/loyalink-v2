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

// ── Member link token ──
// The token in the links StreamInk sends (API invite_link) and in the pass
// back-field link. It has no expiry. It carries the member's
// customers.link_token_version; rotating bumps the version, so every older
// link stops opening personal data. It only opens the member page: its scope
// is not customer_access, so /api/pass/generate and the pass-service reject it.

type MemberLinkPayload = { c: string; s: 'member_link'; v: number }

export function createMemberLinkToken(customerId: string, version: number): string {
  const payload: MemberLinkPayload = { c: customerId, s: 'member_link', v: version }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifyMemberLinkToken(token: string | null | undefined): { customerId: string; version: number } | null {
  if (!token) return null
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(sign(encodedPayload))
  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) return null
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as MemberLinkPayload
    if (payload.s !== 'member_link' || !payload.c || !Number.isInteger(payload.v)) return null
    return { customerId: payload.c, version: payload.v }
  } catch {
    return null
  }
}

/** The member's current link version. A row from before migration 028 has none: 1. */
export function memberLinkVersion(row: { link_token_version?: unknown } | Record<string, unknown> | null | undefined): number {
  const v = Number((row as { link_token_version?: unknown } | null | undefined)?.link_token_version ?? 1)
  return Number.isInteger(v) && v > 0 ? v : 1
}

/**
 * Does this token open the member's personal data (balance, activity,
 * friends)? Either a valid customer access token for this customer that is
 * not pass-only, or a member link token for this customer at the current
 * link version.
 */
export function hasPersonalDataAccess(
  token: string | null | undefined,
  customerId: string,
  linkVersion = 1,
): boolean {
  const payload = verifyCustomerAccessToken(token)
  if (payload) return payload.customerId === customerId && !payload.pass_only
  const link = verifyMemberLinkToken(token)
  return !!link && link.customerId === customerId && link.version === linkVersion
}

export function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue?.startsWith('Bearer ')) return null
  return headerValue.slice('Bearer '.length).trim() || null
}

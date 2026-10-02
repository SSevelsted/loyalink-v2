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
  if (!token) {
    console.log('[customerAccess] reject: token missing')
    return null
  }

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    console.log('[customerAccess] reject: malformed (missing payload or signature)')
    return null
  }

  const expected = sign(encodedPayload)
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)

  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) {
    console.log(`[customerAccess] reject: signature mismatch (got len=${actual.length}, expected len=${wanted.length})`)
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as CustomerAccessPayload

    if (payload.scope !== 'customer_access') {
      console.log(`[customerAccess] reject: bad scope "${payload.scope}"`)
      return null
    }
    if (!payload.customerId) {
      console.log('[customerAccess] reject: missing customerId')
      return null
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      console.log(`[customerAccess] reject: expired (exp=${payload.exp}, now=${Math.floor(Date.now() / 1000)})`)
      return null
    }

    return payload
  } catch (err) {
    console.log(`[customerAccess] reject: payload parse error: ${(err as Error).message}`)
    return null
  }
}

/**
 * Member link token, same format as createMemberLinkToken in the app
 * (src/lib/customer-access.ts): { c, s: 'member_link', v } signed with
 * CUSTOMER_ACCESS_SECRET, no expiry. Goes only in the pass back-field link
 * (seen by the card holder), never in the barcode. Rotating
 * customers.link_token_version revokes it.
 */
export function createMemberLinkToken(customerId: string, linkTokenVersion: unknown): string {
  const v = Number(linkTokenVersion ?? 1);
  const payload = { c: customerId, s: 'member_link', v: Number.isInteger(v) && v > 0 ? v : 1 };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

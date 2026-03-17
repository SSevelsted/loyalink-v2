const PASS_SERVICE_URL = process.env.NEXT_PUBLIC_PASS_SERVICE_URL || 'https://pass.loyalink.ai'

function getInternalSecret(): string {
  const secret = process.env.PASS_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error('A pass service secret is required')
  }

  return secret
}

export async function passServiceFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('x-loyalink-internal-secret', getInternalSecret())

  return fetch(`${PASS_SERVICE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
}

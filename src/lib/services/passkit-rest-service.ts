import { createHmac } from 'node:crypto'

type PasskitConfig = {
  apiPrefix: string
  apiKey: string
  apiSecret: string
}

type PasskitMember = {
  id?: string
  programId?: string
  tierId?: string
  status?: string
  points?: number
  passMetaData?: {
    status?: string
    lastUpdatedAt?: string | null
  }
}

export type PasskitMemberSyncResult =
  | { status: 'skipped'; reason: 'not_configured' | 'missing_member_id' }
  | {
      status: 'updated'
      memberId: string
      programId: string | null
      previousPoints: number | null
      points: number
      passStatus: string | null
    }
  | {
      status: 'failed'
      memberId: string | null
      error: string
      httpStatus?: number
    }

type PasskitError = Error & { status?: number }

const DEFAULT_PASSKIT_API_PREFIX = 'https://api.pub1.passkit.io'

export async function syncPasskitMemberPoints(input: {
  memberId: string | null | undefined
  points: number
}): Promise<PasskitMemberSyncResult> {
  const memberId = input.memberId?.trim()
  if (!memberId) return { status: 'skipped', reason: 'missing_member_id' }

  const config = getPasskitConfig()
  if (!config) return { status: 'skipped', reason: 'not_configured' }

  try {
    const nextPoints = roundPoints(input.points)
    const before = await getPasskitMember(config, memberId)
    await passkitFetch(config, '/members/member', {
      method: 'PUT',
      body: JSON.stringify({
        id: memberId,
        points: nextPoints,
      }),
    })

    return {
      status: 'updated',
      memberId,
      programId: before.programId ?? null,
      previousPoints: typeof before.points === 'number' ? before.points : null,
      points: nextPoints,
      passStatus: before.passMetaData?.status ?? null,
    }
  } catch (err) {
    const error = err as PasskitError
    return {
      status: 'failed',
      memberId,
      error: error.message || 'PassKit update failed',
      httpStatus: error.status,
    }
  }
}

function getPasskitConfig(): PasskitConfig | null {
  const apiKey = process.env.PASSKIT_API_KEY
  const apiSecret = process.env.PASSKIT_API_SECRET
  if (!apiKey || !apiSecret) return null

  return {
    apiPrefix: (process.env.PASSKIT_API_PREFIX || DEFAULT_PASSKIT_API_PREFIX).replace(/\/+$/, ''),
    apiKey,
    apiSecret,
  }
}

async function getPasskitMember(config: PasskitConfig, memberId: string) {
  return passkitFetch<PasskitMember>(
    config,
    `/members/member/id/${encodeURIComponent(memberId)}`
  )
}

async function passkitFetch<T = unknown>(
  config: PasskitConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', createPasskitJwt(config))
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${config.apiPrefix}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  const text = await res.text()
  const body = parseJson(text)

  if (!res.ok) {
    const message = getPasskitErrorMessage(body) ?? `PassKit request failed (${res.status})`
    const error = new Error(message) as PasskitError
    error.status = res.status
    throw error
  }

  return body as T
}

function createPasskitJwt(config: PasskitConfig) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' })
  const payload = base64UrlJson({
    uid: config.apiKey,
    iat: now,
    exp: now + 1800,
  })
  const signingInput = `${header}.${payload}`
  const signature = createHmac('sha256', config.apiSecret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signingInput}.${signature}`
}

function base64UrlJson(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function parseJson(text: string) {
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { error: text }
  }
}

function getPasskitErrorMessage(body: unknown) {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  return typeof record.error === 'string'
    ? record.error
    : typeof record.message === 'string'
      ? record.message
      : null
}

function roundPoints(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

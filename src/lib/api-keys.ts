import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/studio-access'
import { getBearerToken } from '@/lib/customer-access'

const KEY_PREFIX = 'lk_live_'

export function generateApiKey(): { raw: string; hash: string } {
  const random = crypto.randomBytes(32).toString('base64url')
  const raw = `${KEY_PREFIX}${random}`
  return { raw, hash: hashApiKey(raw) }
}

export function hashApiKey(raw: string): string {
  const keyPortion = raw.startsWith(KEY_PREFIX) ? raw.slice(KEY_PREFIX.length) : raw
  return crypto.createHash('sha256').update(keyPortion).digest('hex')
}

type ApiKeyResult = {
  studioId: string | null
  keyId: string
}

export async function validateApiKey(request: NextRequest): Promise<ApiKeyResult | null> {
  const token = getBearerToken(request.headers.get('authorization'))
  if (!token) return null

  // Check master key first (timing-safe)
  const masterKey = process.env.LOYALINK_MASTER_API_KEY
  if (masterKey) {
    const a = Buffer.from(token)
    const b = Buffer.from(masterKey)
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { studioId: null, keyId: 'master' }
    }
  }

  // Must be a prefixed key
  if (!token.startsWith(KEY_PREFIX)) return null

  const hash = hashApiKey(token)
  const { data } = await adminSupabase
    .from('api_keys')
    .select('id, studio_id')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (!data) return null

  // Update last_used_at (fire-and-forget)
  void adminSupabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then()

  return { studioId: data.studio_id, keyId: data.id }
}

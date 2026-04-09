import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'
import { validateApiKey } from '@/lib/api-keys'
import { verifyEmbedToken } from '@/lib/embed-access'

type AuthResult =
  | { authorized: true; source: 'session' | 'embed' | 'api'; userId?: string }
  | { authorized: false }

export async function authorizeRequest(
  studioId: string,
  request: NextRequest,
): Promise<AuthResult> {
  // 1. Try session auth
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (user) {
      const { data: membership } = await adminSupabase
        .from('studio_members')
        .select('id')
        .eq('studio_id', studioId)
        .eq('user_id', user.id)
        .single()
      if (membership) return { authorized: true, source: 'session', userId: user.id }
    }
  } catch {
    // Session auth not available (e.g. no cookies)
  }

  // 2. Try embed token
  const embedToken = request.headers.get('x-embed-token')
  if (embedToken) {
    const payload = verifyEmbedToken(embedToken)
    if (payload && payload.studioId === studioId) {
      return { authorized: true, source: 'embed' }
    }
  }

  // 3. Try API key
  const apiAuth = await validateApiKey(request)
  if (apiAuth && apiAuth.studioId === studioId) {
    return { authorized: true, source: 'api' }
  }

  return { authorized: false }
}

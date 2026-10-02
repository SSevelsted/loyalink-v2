import { adminSupabase } from '@/lib/studio-access'

// Team invitations, read and claimed with the service key.
//
// The invitee is not a studio member yet (often not even signed in), so row
// level security gives them no access to `invitations`. Before, a policy let
// anyone read every invitation; now only these server functions can, and only
// by the exact token.

export type InvitationRow = {
  id: string
  studio_id: string
  email: string
  role: string
  token: string
  expires_at: string
  accepted_at: string | null
}

export type InvitationPreview = {
  email: string
  role: string
  expiresAt: string
  studioName: string | null
}

export type InvitationLookup =
  | { status: 'ok'; invitation: InvitationPreview }
  | { status: 'not_found' }
  | { status: 'expired' }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `invitations.token` is a uuid column. Reject anything else before a query (Postgres would error on it). */
export function isPlausibleToken(token: unknown): token is string {
  return typeof token === 'string' && UUID_RE.test(token)
}

/** What the invite page shows: only the open invitation that matches this exact token. */
export async function lookupInvitation(token: unknown, now: Date = new Date()): Promise<InvitationLookup> {
  if (!isPlausibleToken(token)) return { status: 'not_found' }

  const { data: invitation } = await adminSupabase
    .from('invitations')
    .select('id, studio_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .is('accepted_at', null)
    .maybeSingle()

  if (!invitation) return { status: 'not_found' }
  if (new Date(invitation.expires_at as string) < now) return { status: 'expired' }

  const { data: studio } = await adminSupabase
    .from('studios')
    .select('name')
    .eq('id', invitation.studio_id as string)
    .maybeSingle()

  return {
    status: 'ok',
    invitation: {
      email: invitation.email as string,
      role: invitation.role as string,
      expiresAt: invitation.expires_at as string,
      studioName: (studio?.name as string | undefined) ?? null,
    },
  }
}

export type ClaimResult =
  | { status: 'claimed'; invitation: InvitationRow }
  | { status: 'not_found' }
  | { status: 'expired' }

/**
 * Atomically mark the invitation accepted (only one caller wins the
 * `accepted_at IS NULL` race). An expired invitation is released again.
 */
export async function claimInvitation(token: unknown, now: Date = new Date()): Promise<ClaimResult> {
  if (!isPlausibleToken(token)) return { status: 'not_found' }

  const { data: invitation, error } = await adminSupabase
    .from('invitations')
    .update({ accepted_at: now.toISOString() })
    .eq('token', token)
    .is('accepted_at', null)
    .select('*')
    .maybeSingle()

  if (error || !invitation) return { status: 'not_found' }

  if (new Date(invitation.expires_at as string) < now) {
    await releaseInvitation(invitation.id as string)
    return { status: 'expired' }
  }

  return { status: 'claimed', invitation: invitation as InvitationRow }
}

/** Undo a claim, e.g. when sign-up fails after the claim. */
export async function releaseInvitation(invitationId: string): Promise<void> {
  await adminSupabase.from('invitations').update({ accepted_at: null }).eq('id', invitationId)
}

/** Add the user to the invitation's studio. A duplicate membership counts as success. */
export async function addInvitedMember(invitation: InvitationRow, userId: string): Promise<{ ok: boolean }> {
  const { error } = await adminSupabase.from('studio_members').insert({
    studio_id: invitation.studio_id,
    user_id: userId,
    role: invitation.role,
  })
  if (!error) return { ok: true }
  const duplicate = error.code === '23505' || error.message.includes('duplicate')
  return { ok: duplicate }
}

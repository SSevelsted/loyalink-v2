import { adminSupabase } from '@/lib/studio-access'
import { pushCustomerPass } from '@/lib/pass-push'
import { memberLinkVersion } from '@/lib/customer-access'
import { memberInviteLink } from '@/lib/member-links'

export class MemberLinkError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'MemberLinkError'
  }
}

/**
 * Revoke every member link token for this member and return the new link.
 * Bumps customers.link_token_version with a guarded write (a concurrent
 * rotation makes this one fail with 409, never a silent double bump), then
 * pushes the pass so its back-field link carries the new token.
 */
export async function rotateMemberLink(studioId: string, customerId: string): Promise<{ invite_link: string; link_token_version: number }> {
  const { data: member } = await adminSupabase
    .from('customers')
    .select('id, member_id, link_token_version')
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .maybeSingle()
  if (!member) throw new MemberLinkError('Member not found', 404)

  const current = memberLinkVersion(member)
  const next = current + 1
  const { data: updated, error } = await adminSupabase
    .from('customers')
    .update({ link_token_version: next })
    .eq('id', customerId)
    .eq('studio_id', studioId)
    .eq('link_token_version', current)
    .select('id, member_id, link_token_version')
  if (error) throw new MemberLinkError(`Failed to rotate link: ${error.message}`, 500)
  if (!updated || updated.length === 0) throw new MemberLinkError('Link was rotated at the same time; try again', 409)

  pushCustomerPass(customerId)
  return { invite_link: memberInviteLink(updated[0]), link_token_version: next }
}

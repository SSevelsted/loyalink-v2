import { MARKETING_URL } from '@/lib/constants'
import { createMemberLinkToken, memberLinkVersion } from '@/lib/customer-access'

type MemberLinkRow = { id: string; member_id?: string | null; link_token_version?: unknown }

/**
 * Onboarding link: opens the member page in full view (member link token)
 * and auto-adds the pass on mobile. This is the link StreamInk sends to the
 * client. Never put it in a QR code or barcode: the card's code carries only
 * the member id (public view).
 */
export function memberInviteLink(member: MemberLinkRow): string {
  const publicId = member.member_id ?? member.id
  const token = createMemberLinkToken(member.id, memberLinkVersion(member))
  return `${MARKETING_URL}/loyalty/${publicId}?addPass=1&token=${token}`
}

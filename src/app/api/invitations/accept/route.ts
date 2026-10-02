import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { auditLog } from '@/lib/audit-log'
import { addInvitedMember, claimInvitation, releaseInvitation } from '@/lib/services/invitation-service'

export async function POST(request: NextRequest) {
  const { token, email, password } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  // The session client is only for auth (who is signed in, sign up + session
  // cookies). The invitee is not a studio member yet, so RLS hides the
  // invitation from them: claim it and add the membership with the service key.
  const supabase = await createClient()

  // Atomically claim the invitation to prevent race conditions
  const claim = await claimInvitation(token)
  if (claim.status === 'not_found') {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }
  if (claim.status === 'expired') {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }
  const invitation = claim.invitation

  // Check if user is already authenticated
  const { data: { user: existingUser } } = await supabase.auth.getUser()

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Create new user via sign up
    if (!email || !password) {
      await releaseInvitation(invitation.id)
      return NextResponse.json({ error: 'Email and password required for new account' }, { status: 400 })
    }

    // Ensure the email matches the invitation to prevent token hijacking
    if (String(email).toLowerCase() !== invitation.email.toLowerCase()) {
      await releaseInvitation(invitation.id)
      return NextResponse.json({ error: 'Email does not match invitation' }, { status: 400 })
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !signUpData.user) {
      await releaseInvitation(invitation.id)
      return NextResponse.json({ error: signUpError?.message ?? 'Failed to create account' }, { status: 400 })
    }

    userId = signUpData.user.id
  }

  // Add user to studio (an existing membership counts as success)
  const { ok } = await addInvitedMember(invitation, userId)
  if (!ok) {
    await releaseInvitation(invitation.id)
    return NextResponse.json({ error: 'Failed to add to studio' }, { status: 500 })
  }

  void auditLog({
    action: 'invitation.accepted',
    studioId: invitation.studio_id,
    actorId: userId,
    actorType: 'user',
    targetType: 'invitation',
    targetId: invitation.id,
    metadata: { role: invitation.role, email: invitation.email },
  })

  return NextResponse.json({ success: true })
}

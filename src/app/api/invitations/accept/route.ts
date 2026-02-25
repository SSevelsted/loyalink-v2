import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { token, email, password } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Look up invitation
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  // Check if user is already authenticated
  const { data: { user: existingUser } } = await supabase.auth.getUser()

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Create new user via sign up
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required for new account' }, { status: 400 })
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !signUpData.user) {
      return NextResponse.json({ error: signUpError?.message ?? 'Failed to create account' }, { status: 400 })
    }

    userId = signUpData.user.id
  }

  // Add user to studio
  const { error: memberError } = await supabase.from('studio_members').insert({
    studio_id: invitation.studio_id,
    user_id: userId,
    role: invitation.role,
  })

  if (memberError) {
    // Might already be a member
    if (!memberError.message.includes('duplicate')) {
      return NextResponse.json({ error: 'Failed to add to studio' }, { status: 500 })
    }
  }

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ success: true })
}

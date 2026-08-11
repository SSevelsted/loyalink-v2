import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TRIAL_DAYS = 30
const stripeEnabled = !!process.env.STRIPE_SECRET_KEY

async function verifySuperAdmin() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('studio_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .limit(1)
    .single()
  return data ? user : null
}

/**
 * PATCH /api/admin/studios/[id]
 * Body: { action: 'remove_agency' | 'cancel' | 'enable_legacy_loyalty' | 'disable_legacy_loyalty', legacyStudioId? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifySuperAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action, legacyStudioId } = await request.json() as { action: string; legacyStudioId?: string }

  const { data: studio } = await supabase
    .from('studios')
    .select('*')
    .eq('id', id)
    .single()

  if (!studio) return NextResponse.json({ error: 'Studio not found' }, { status: 404 })

  if (action === 'remove_agency') {
    // Remove the 100% coupon and add a 30-day trial
    if (stripeEnabled && studio.stripe_subscription_id) {
      try {
        // Remove discount
        await getStripe().subscriptions.deleteDiscount(studio.stripe_subscription_id)
        // Add a 30-day trial from now
        const trialEnd = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60
        await getStripe().subscriptions.update(studio.stripe_subscription_id, {
          trial_end: trialEnd,
        })
      } catch (err) {
        console.error('[admin/studios] Stripe remove_agency error:', err)
      }
    }

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('studios')
      .update({ is_agency: false, subscription_status: 'trial', trial_ends_at: trialEndsAt })
      .eq('id', id)

    return NextResponse.json({ success: true, status: 'trial' })
  }

  if (action === 'cancel') {
    if (stripeEnabled && studio.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.update(studio.stripe_subscription_id, {
          cancel_at_period_end: true,
        })
      } catch (err) {
        console.error('[admin/studios] Stripe cancel error:', err)
      }
    }
    await supabase
      .from('studios')
      .update({ subscription_status: 'cancelled' })
      .eq('id', id)

    return NextResponse.json({ success: true, status: 'cancelled' })
  }

  // Enable legacy loyalty on an existing studio. Agency-only, mirroring the
  // create route — legacy migrations are decided after a studio already exists,
  // so this is the only place they can be turned on without a manual SQL merge.
  if (action === 'enable_legacy_loyalty') {
    if (!studio.is_agency) {
      return NextResponse.json({ error: 'Legacy loyalty can only be enabled for agency studios' }, { status: 400 })
    }

    const trimmedLegacyId = legacyStudioId?.trim()
    if (!trimmedLegacyId) {
      return NextResponse.json({ error: 'legacyStudioId is required' }, { status: 400 })
    }

    const currentSettings = (studio.settings ?? {}) as Record<string, unknown>
    const settings = {
      ...currentSettings,
      legacy_loyalty: {
        enabled: true,
        provider: 'passkit_lovable',
        legacy_studio_id: trimmedLegacyId,
        resolve_on_scan: true,
        create_shadow_on_resolve: true,
        passkit_update_enabled: true,
      },
    }

    const { error } = await supabase.from('studios').update({ settings }).eq('id', id)
    if (error) {
      console.error('[admin/studios] enable_legacy_loyalty error:', error)
      return NextResponse.json({ error: 'Failed to enable legacy loyalty' }, { status: 500 })
    }

    return NextResponse.json({ success: true, legacyStudioId: trimmedLegacyId })
  }

  // Disable legacy loyalty. Keep legacy_studio_id so re-enabling is one click;
  // flipping enabled/resolve_on_scan off is enough to stop the scan resolver.
  if (action === 'disable_legacy_loyalty') {
    const currentSettings = (studio.settings ?? {}) as Record<string, unknown>
    const currentLegacy = (currentSettings.legacy_loyalty ?? {}) as Record<string, unknown>
    const settings = {
      ...currentSettings,
      legacy_loyalty: { ...currentLegacy, enabled: false, resolve_on_scan: false },
    }

    const { error } = await supabase.from('studios').update({ settings }).eq('id', id)
    if (error) {
      console.error('[admin/studios] disable_legacy_loyalty error:', error)
      return NextResponse.json({ error: 'Failed to disable legacy loyalty' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

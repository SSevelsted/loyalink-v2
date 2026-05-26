import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/studio-access'

type LegacyLoyaltySettings = {
  enabled?: boolean
  provider?: string
  legacy_studio_id?: string
  resolve_on_scan?: boolean
  create_shadow_on_resolve?: boolean
}

type LegacyMember = {
  id: string
  member_id: string
  passkit_id: string | null
  pass_provider: string | null
  studio_id: string
  name: string | null
  email: string | null
  phone: string | null
  contact_id: string | null
  balance: number | string | null
  cashback_rate: number | string | null
  loyalty_stage: string | null
  total_spend: number | string | null
  full_project_count: number | null
  referrals_count: number | null
  successful_referrals_count: number | null
  card_install_status: string | null
  card_issued_at: string | null
  card_first_installed_at: string | null
  card_uninstalled_at: string | null
  last_activity_at: string | null
  tags: string[] | null
  created_at: string | null
  updated_at: string | null
  barcode_payload: string | null
  barcode_pid: string | null
  barcode_pid_type: string | null
}

const PROVIDER = 'passkit_lovable'

export async function POST(request: NextRequest) {
  try {
    const { studioId, scannedValue } = await request.json()

    if (!studioId || !scannedValue?.trim()) {
      return NextResponse.json({ error: 'studioId and scannedValue are required' }, { status: 400 })
    }

    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: memberships } = await adminSupabase
      .from('studio_members')
      .select('studio_id, role')
      .eq('user_id', user.id)

    const canAccessStudio = (memberships ?? []).some((m) => m.studio_id === studioId || m.role === 'super_admin')
    if (!canAccessStudio) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: studio, error: studioError } = await adminSupabase
      .from('studios')
      .select('settings')
      .eq('id', studioId)
      .single()

    if (studioError || !studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }

    const settings = (studio.settings ?? {}) as Record<string, unknown>
    const legacy = (settings.legacy_loyalty ?? {}) as LegacyLoyaltySettings
    if (!legacy.enabled || legacy.resolve_on_scan === false || !legacy.legacy_studio_id) {
      return NextResponse.json({ error: 'Legacy loyalty is not enabled for this studio' }, { status: 404 })
    }

    const legacyUrl = process.env.LEGACY_LOYALTY_SUPABASE_URL
    const legacyServiceRoleKey = process.env.LEGACY_LOYALTY_SERVICE_ROLE_KEY
    if (!legacyUrl || !legacyServiceRoleKey) {
      return NextResponse.json({ error: 'Legacy loyalty is not configured' }, { status: 503 })
    }

    const legacySupabase = createSupabaseClient(legacyUrl, legacyServiceRoleKey)
    const { data: legacyRows, error: legacyError } = await legacySupabase.rpc(
      'get_legacy_member_by_studio_and_barcode_payload',
      {
        p_studio_id: legacy.legacy_studio_id,
        p_payload: scannedValue.trim(),
      }
    )

    if (legacyError) {
      console.error('[legacy-loyalty] lookup failed', legacyError)
      return NextResponse.json({ error: 'Legacy lookup failed' }, { status: 502 })
    }

    const rows = (legacyRows ?? []) as LegacyMember[]
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Legacy member not found' }, { status: 404 })
    }
    if (rows.length > 1) {
      await logAudit(studioId, 'legacy_loyalty.duplicate_lookup', null, { scannedValue, count: rows.length })
      return NextResponse.json({ error: 'Multiple legacy members matched this scan' }, { status: 409 })
    }

    const legacyMember = rows[0]
    const existingLink = await findExistingLink(studioId, legacy.legacy_studio_id, legacyMember.member_id)
    if (existingLink?.customer_id) {
      return NextResponse.json({ customerId: existingLink.customer_id, source: 'legacy_existing_shadow' })
    }

    if (legacy.create_shadow_on_resolve === false) {
      return NextResponse.json({ error: 'Legacy shadow creation is disabled' }, { status: 404 })
    }

    const customerId = await findOrCreateShadowCustomer(studioId, legacy.legacy_studio_id, legacyMember)
    await upsertLegacyLink(studioId, customerId, legacy.legacy_studio_id, legacyMember, scannedValue.trim())
    await logAudit(studioId, 'legacy_loyalty.shadow_resolved', customerId, {
      legacy_studio_id: legacy.legacy_studio_id,
      legacy_member_id: legacyMember.member_id,
      legacy_passkit_id: legacyMember.passkit_id,
    })

    return NextResponse.json({ customerId, source: 'legacy_shadow' })
  } catch (err) {
    console.error('[legacy-loyalty] resolve error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function findExistingLink(studioId: string, legacyStudioId: string, legacyMemberId: string) {
  const { data } = await adminSupabase
    .from('legacy_loyalty_links')
    .select('customer_id')
    .eq('studio_id', studioId)
    .eq('provider', PROVIDER)
    .eq('legacy_studio_id', legacyStudioId)
    .eq('legacy_member_id', legacyMemberId)
    .maybeSingle()

  return data as { customer_id: string } | null
}

async function findOrCreateShadowCustomer(studioId: string, legacyStudioId: string, legacyMember: LegacyMember) {
  const existingCustomer = await findExistingCustomerByContact(studioId, legacyMember)
  if (existingCustomer) {
    await mergeLegacyMetadata(existingCustomer.id, legacyStudioId, legacyMember)
    return existingCustomer.id
  }

  const metadata = buildLegacyMetadata(legacyStudioId, legacyMember)
  const tags = Array.from(new Set([...(legacyMember.tags ?? []), 'legacy_passkit', 'legacy_shadow']))
  const createdAt = isValidDate(legacyMember.created_at) ? legacyMember.created_at : undefined

  const { data: customer, error } = await adminSupabase
    .from('customers')
    .insert({
      studio_id: studioId,
      name: legacyMember.name?.trim() || 'Legacy customer',
      email: legacyMember.email || null,
      phone: legacyMember.phone || null,
      contact_id: legacyMember.contact_id || null,
      balance: toNumber(legacyMember.balance),
      cashback_rate: normalizeCashbackRate(legacyMember.cashback_rate),
      loyalty_stage: legacyMember.loyalty_stage || 'base',
      tags,
      pass_provider: 'legacy_passkit',
      metadata,
      ...(createdAt ? { created_at: createdAt } : {}),
    })
    .select('id')
    .single()

  if (error || !customer) {
    throw new Error(error?.message ?? 'Failed to create shadow customer')
  }

  return customer.id
}

async function findExistingCustomerByContact(studioId: string, legacyMember: LegacyMember) {
  if (legacyMember.email) {
    const { data } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('studio_id', studioId)
      .eq('email', legacyMember.email)
      .limit(1)
      .maybeSingle()

    if (data) return data as { id: string }
  }

  if (!legacyMember.phone) return null

  const { data } = await adminSupabase
    .from('customers')
    .select('id')
    .eq('studio_id', studioId)
    .eq('phone', legacyMember.phone)
    .limit(1)
    .maybeSingle()

  return data as { id: string } | null
}

async function mergeLegacyMetadata(customerId: string, legacyStudioId: string, legacyMember: LegacyMember) {
  const { data: existing } = await adminSupabase
    .from('customers')
    .select('metadata, tags, pass_provider')
    .eq('id', customerId)
    .single()

  const metadata = {
    ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
  }
  const legacyMetadata = buildLegacyMetadata(legacyStudioId, legacyMember)
  metadata.source = metadata.source ?? legacyMetadata.source
  metadata.legacy_loyalty = legacyMetadata.legacy_loyalty
  const tags = Array.from(new Set([...(existing?.tags ?? []), 'legacy_passkit']))

  await adminSupabase
    .from('customers')
    .update({
      metadata,
      tags,
      pass_provider: existing?.pass_provider === 'self_hosted' ? existing.pass_provider : 'legacy_passkit',
    })
    .eq('id', customerId)
}

async function upsertLegacyLink(
  studioId: string,
  customerId: string,
  legacyStudioId: string,
  legacyMember: LegacyMember,
  scannedValue: string
) {
  const { error } = await adminSupabase
    .from('legacy_loyalty_links')
    .upsert({
      studio_id: studioId,
      customer_id: customerId,
      provider: PROVIDER,
      legacy_project: 'lovable',
      legacy_studio_id: legacyStudioId,
      legacy_customer_id: legacyMember.id,
      legacy_member_id: legacyMember.member_id,
      legacy_passkit_id: legacyMember.passkit_id,
      legacy_barcode_payload: legacyMember.barcode_payload || scannedValue,
      legacy_payload: legacyMember,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'studio_id,provider,legacy_studio_id,legacy_member_id',
    })

  if (error) {
    throw new Error(error.message)
  }
}

async function logAudit(studioId: string, action: string, customerId: string | null, metadata: Record<string, unknown>) {
  await adminSupabase.from('audit_logs').insert({
    studio_id: studioId,
    action,
    actor_type: 'system',
    target_type: customerId ? 'customer' : 'legacy_loyalty',
    target_id: customerId,
    metadata,
  })
}

function buildLegacyMetadata(legacyStudioId: string, legacyMember: LegacyMember) {
  return {
    source: 'legacy_passkit',
    legacy_loyalty: {
      provider: PROVIDER,
      legacy_project: 'lovable',
      legacy_studio_id: legacyStudioId,
      legacy_customer_id: legacyMember.id,
      legacy_member_id: legacyMember.member_id,
      legacy_passkit_id: legacyMember.passkit_id,
      barcode_payload: legacyMember.barcode_payload,
      barcode_pid: legacyMember.barcode_pid,
      barcode_pid_type: legacyMember.barcode_pid_type,
      card_install_status: legacyMember.card_install_status,
      card_issued_at: legacyMember.card_issued_at,
      card_first_installed_at: legacyMember.card_first_installed_at,
      card_uninstalled_at: legacyMember.card_uninstalled_at,
      legacy_balance: toNumber(legacyMember.balance),
      legacy_cashback_rate: legacyMember.cashback_rate,
      legacy_total_spend: toNumber(legacyMember.total_spend),
      legacy_full_project_count: legacyMember.full_project_count,
      legacy_referrals_count: legacyMember.referrals_count,
      legacy_successful_referrals_count: legacyMember.successful_referrals_count,
      legacy_last_activity_at: legacyMember.last_activity_at,
      imported_at: new Date().toISOString(),
      raw: legacyMember,
    },
  }
}

function normalizeCashbackRate(value: number | string | null) {
  const n = toNumber(value)
  return n > 0 && n <= 1 ? n * 100 : n
}

function toNumber(value: number | string | null) {
  if (value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function isValidDate(value: string | null): value is string {
  return !!value && !Number.isNaN(new Date(value).getTime())
}

import { adminSupabase } from '@/lib/studio-access'

type AuditAction =
  | 'api_key.created' | 'api_key.revoked' | 'api_key.rotated'
  | 'webhook.created' | 'webhook.deleted'
  | 'invitation.sent' | 'invitation.accepted'
  | 'studio.created' | 'studio.cancelled'
  | 'member.role_changed'
  | 'settings.updated'

export async function auditLog(params: {
  action: AuditAction
  studioId: string | null
  actorId: string | null
  actorType: 'user' | 'api_key' | 'system'
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await adminSupabase.from('audit_logs').insert({
      action: params.action,
      studio_id: params.studioId,
      actor_id: params.actorId,
      actor_type: params.actorType,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? null,
    })
  } catch {
    console.error('[audit] Failed to log:', params.action)
  }
}

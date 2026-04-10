-- Audit log for sensitive operations (API key management, webhooks, invitations, etc.)
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  studio_id uuid references studios(id) on delete set null,
  actor_id uuid,
  actor_type text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_studio on audit_logs(studio_id, created_at desc);
create index idx_audit_logs_action on audit_logs(action, created_at desc);

alter table audit_logs enable row level security;

-- Only service role can insert (from API routes via adminSupabase)
-- No public access

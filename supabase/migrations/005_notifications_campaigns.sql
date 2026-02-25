-- 005_notifications_campaigns.sql
-- Push campaigns, automations, and customer metadata

-- ============================================================
-- Customer metadata
-- ============================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_customers_metadata ON customers USING gin (metadata);

-- ============================================================
-- Push Campaigns
-- ============================================================

CREATE TABLE push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'pass_update',
  audience_type TEXT NOT NULL DEFAULT 'all'
    CHECK (audience_type IN ('all', 'segment', 'customers')),
  audience_filter JSONB DEFAULT '{}',
  content JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  audience_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_studio ON push_campaigns(studio_id);
CREATE INDEX idx_campaigns_status ON push_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON push_campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- ============================================================
-- Push Automations
-- ============================================================

CREATE TABLE push_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'pass_update',
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  audience_filter JSONB DEFAULT '{}',
  content JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_automations_studio ON push_automations(studio_id);
CREATE INDEX idx_automations_enabled ON push_automations(is_enabled) WHERE is_enabled = true;

-- ============================================================
-- Push Automation Logs (deduplication)
-- ============================================================

CREATE TABLE push_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES push_automations(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_automation_logs_automation ON push_automation_logs(automation_id);
CREATE INDEX idx_automation_logs_dedup ON push_automation_logs(automation_id, customer_id);

-- ============================================================
-- Link push logs to campaigns/automations
-- ============================================================

ALTER TABLE wallet_push_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES push_campaigns(id) ON DELETE SET NULL;
ALTER TABLE wallet_push_logs ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES push_automations(id) ON DELETE SET NULL;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_automation_logs ENABLE ROW LEVEL SECURITY;

-- Push Campaigns
CREATE POLICY "campaigns_select" ON push_campaigns FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "campaigns_insert" ON push_campaigns FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "campaigns_update" ON push_campaigns FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "campaigns_delete" ON push_campaigns FOR DELETE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Push Automations
CREATE POLICY "automations_select" ON push_automations FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "automations_insert" ON push_automations FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "automations_update" ON push_automations FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "automations_delete" ON push_automations FOR DELETE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Automation Logs
CREATE POLICY "automation_logs_select" ON push_automation_logs FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "automation_logs_insert" ON push_automation_logs FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- ============================================================
-- Updated_at triggers
-- ============================================================

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON push_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER automations_updated_at BEFORE UPDATE ON push_automations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

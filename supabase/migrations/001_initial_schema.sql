-- LoyaLink v2 - Initial Schema
-- Run this in your new Supabase project's SQL editor

-- ============================================================
-- Core Tables
-- ============================================================

CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE studio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'super_admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(studio_id, user_id)
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Customers
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_id TEXT,
  member_id TEXT UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  cashback_rate DECIMAL(5,2),
  loyalty_stage TEXT DEFAULT 'bronze',
  tags TEXT[] DEFAULT '{}',
  pass_provider TEXT DEFAULT 'self_hosted',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Transactions
-- ============================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'adjustment', 'cashback')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Wallet / Pass
-- ============================================================

CREATE TABLE pass_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  logo_url TEXT,
  icon_url TEXT,
  tier_themes JSONB DEFAULT '{}',
  card_fields JSONB DEFAULT '[]',
  static_texts JSONB DEFAULT '{}',
  barcode_format TEXT DEFAULT 'PKBarcodeFormatQR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE wallet_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  template_id UUID REFERENCES pass_templates(id),
  serial_number TEXT NOT NULL,
  authentication_token TEXT NOT NULL,
  platform TEXT DEFAULT 'apple' CHECK (platform IN ('apple', 'google')),
  version INT DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'voided', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE wallet_device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_library_identifier TEXT NOT NULL,
  push_token TEXT NOT NULL,
  platform TEXT DEFAULT 'apple',
  serial_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_library_identifier, serial_number)
);

CREATE TABLE wallet_push_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'customer', 'tier')),
  customer_id UUID REFERENCES customers(id),
  message_type TEXT,
  total_devices INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Landing Pages
-- ============================================================

CREATE TABLE studio_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  headline TEXT,
  description TEXT,
  hero_image_url TEXT,
  settings JSONB DEFAULT '{}',
  view_count INT DEFAULT 0,
  signup_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Cashback Tiers
-- ============================================================

CREATE TABLE cashback_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  cashback_rate DECIMAL(5,2) NOT NULL,
  sort_order INT DEFAULT 0
);

-- ============================================================
-- Analytics
-- ============================================================

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Helper Functions (after tables exist)
-- ============================================================

-- Get current user's studio IDs
CREATE OR REPLACE FUNCTION current_user_studio_ids()
RETURNS SETOF UUID AS $$
  SELECT studio_id FROM studio_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM studio_members
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_studio_members_user ON studio_members(user_id);
CREATE INDEX idx_studio_members_studio ON studio_members(studio_id);
CREATE INDEX idx_customers_studio ON customers(studio_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_member_id ON customers(member_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_studio ON transactions(studio_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_wallet_passes_customer ON wallet_passes(customer_id);
CREATE INDEX idx_wallet_passes_serial ON wallet_passes(serial_number);
CREATE INDEX idx_device_reg_serial ON wallet_device_registrations(serial_number);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_landing_pages_slug ON studio_landing_pages(slug);
CREATE INDEX idx_analytics_studio ON analytics_events(studio_id, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_push_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Studios: members can read their studios, super admins can read all
CREATE POLICY "studios_select" ON studios FOR SELECT USING (
  id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "studios_update" ON studios FOR UPDATE USING (
  id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR is_super_admin()
);

-- Studio Members
CREATE POLICY "studio_members_select" ON studio_members FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "studio_members_insert" ON studio_members FOR INSERT WITH CHECK (
  studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR is_super_admin()
);
CREATE POLICY "studio_members_delete" ON studio_members FOR DELETE USING (
  studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR is_super_admin()
);

-- Invitations: studio admins can manage, anyone can read by token
CREATE POLICY "invitations_select" ON invitations FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "invitations_select_by_token" ON invitations FOR SELECT USING (true);
CREATE POLICY "invitations_insert" ON invitations FOR INSERT WITH CHECK (
  studio_id IN (SELECT studio_id FROM studio_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR is_super_admin()
);
CREATE POLICY "invitations_update" ON invitations FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Customers
CREATE POLICY "customers_select" ON customers FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Transactions
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Pass Templates
CREATE POLICY "pass_templates_select" ON pass_templates FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "pass_templates_insert" ON pass_templates FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "pass_templates_update" ON pass_templates FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Wallet Passes
CREATE POLICY "wallet_passes_select" ON wallet_passes FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "wallet_passes_insert" ON wallet_passes FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "wallet_passes_update" ON wallet_passes FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Device Registrations: open access (pass service needs this)
CREATE POLICY "device_reg_all" ON wallet_device_registrations FOR ALL USING (true);

-- Push Logs
CREATE POLICY "push_logs_select" ON wallet_push_logs FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "push_logs_insert" ON wallet_push_logs FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Landing Pages: public read, studio write
CREATE POLICY "landing_pages_select" ON studio_landing_pages FOR SELECT USING (true);
CREATE POLICY "landing_pages_insert" ON studio_landing_pages FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "landing_pages_update" ON studio_landing_pages FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Cashback Tiers
CREATE POLICY "cashback_tiers_select" ON cashback_tiers FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "cashback_tiers_insert" ON cashback_tiers FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "cashback_tiers_update" ON cashback_tiers FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "cashback_tiers_delete" ON cashback_tiers FOR DELETE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Analytics
CREATE POLICY "analytics_select" ON analytics_events FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);
CREATE POLICY "analytics_insert" ON analytics_events FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- ============================================================
-- Updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER studios_updated_at BEFORE UPDATE ON studios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pass_templates_updated_at BEFORE UPDATE ON pass_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER wallet_passes_updated_at BEFORE UPDATE ON wallet_passes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER landing_pages_updated_at BEFORE UPDATE ON studio_landing_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

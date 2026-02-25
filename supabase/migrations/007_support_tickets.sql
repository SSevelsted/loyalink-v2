-- 007_support_tickets.sql
-- Support ticket system with conversation threads

-- ============================================================
-- Support Tickets
-- ============================================================

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'question'
    CHECK (category IN ('bug', 'billing', 'feature_request', 'question', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_tickets_studio ON support_tickets(studio_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Support Ticket Messages
-- ============================================================

CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_messages_created ON support_ticket_messages(created_at);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: studio members + super admins
CREATE POLICY support_tickets_select ON support_tickets FOR SELECT USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

CREATE POLICY support_tickets_insert ON support_tickets FOR INSERT WITH CHECK (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

CREATE POLICY support_tickets_update ON support_tickets FOR UPDATE USING (
  studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
);

-- Messages: studio members + super admins (non-admins filtered in API to exclude is_internal)
CREATE POLICY support_messages_select ON support_ticket_messages FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
  )
);

CREATE POLICY support_messages_insert ON support_ticket_messages FOR INSERT WITH CHECK (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
  )
);

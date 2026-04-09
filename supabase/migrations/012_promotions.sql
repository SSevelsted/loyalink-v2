-- Promotion templates (reusable definitions)
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cashback_boost', 'tier_override')),
  cashback_rate NUMERIC,            -- for cashback_boost
  tier_slug TEXT,                    -- for tier_override
  duration_type TEXT NOT NULL CHECK (duration_type IN ('transactions', 'days', 'unlimited')),
  duration_value INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotions_studio_id ON promotions(studio_id);

-- Promotions applied to specific members (one active per member)
CREATE TABLE member_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('cashback_boost', 'tier_override')),
  cashback_rate NUMERIC,
  tier_slug TEXT,
  original_tier_slug TEXT NOT NULL,
  original_cashback_rate NUMERIC NOT NULL,
  remaining_transactions INTEGER,   -- null if time-based or unlimited
  expires_at TIMESTAMPTZ,           -- null if usage-based
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  applied_by TEXT,                   -- 'api', 'dashboard', or user_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expired_at TIMESTAMPTZ
);

CREATE INDEX idx_member_promotions_customer ON member_promotions(customer_id) WHERE status = 'active';
CREATE INDEX idx_member_promotions_studio ON member_promotions(studio_id);
CREATE INDEX idx_member_promotions_expires ON member_promotions(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;

-- Enforce one active promotion per member
CREATE UNIQUE INDEX idx_one_active_promotion_per_member ON member_promotions(customer_id) WHERE status = 'active';

-- RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_promotions ENABLE ROW LEVEL SECURITY;

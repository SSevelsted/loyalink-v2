-- Rewards & Referrals migration

-- New referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referred_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  activated_at TIMESTAMPTZ,
  commission_expires_at TIMESTAMPTZ,
  total_commission_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_customer_id),
  UNIQUE(studio_id, referral_code)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_studio ON referrals(studio_id);

-- Alter customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS has_purchased BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_real_spend NUMERIC DEFAULT 0;

-- Alter transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_customer_id UUID REFERENCES customers(id);

-- Enable RLS on referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "Service role full access on referrals"
  ON referrals FOR ALL
  USING (true)
  WITH CHECK (true);

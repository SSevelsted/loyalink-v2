-- Single-use trial codes minted from the super-admin panel.
-- A code overrides the default 14-day trial at signup (e.g. 45 days for a
-- lead). Codes are deliberately NOT Stripe coupons: a coupon changes the
-- price after the trial, it cannot change the trial length, and a 100%-off
-- placeholder coupon would risk discounting the first paid invoice.
CREATE TABLE IF NOT EXISTS trial_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  trial_days INTEGER NOT NULL CHECK (trial_days BETWEEN 1 AND 365),
  note TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  redeemed_by_studio_id UUID REFERENCES studios(id) ON DELETE SET NULL,
  redeemed_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_trial_codes_created_at ON trial_codes(created_at DESC);

ALTER TABLE trial_codes ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: rows are only touched by API routes through the
-- service role (signup redemption + super-admin management).

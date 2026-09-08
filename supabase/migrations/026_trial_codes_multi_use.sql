-- Multi-use trial codes.
-- 025 made every code single-use, which is wrong for a public call to action:
-- the first visitor burns the code and everyone after sees "already used".
-- A code now carries a usage cap (max_uses NULL = unlimited) and each
-- redemption gets its own row, so a campaign code can be shared on a page
-- while a lead-specific code stays capped at one.

ALTER TABLE trial_codes
  ADD COLUMN IF NOT EXISTS max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  ADD COLUMN IF NOT EXISTS use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0);

-- Per-redemption attribution, replacing the single redeemed_* columns.
CREATE TABLE IF NOT EXISTS trial_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_code_id UUID NOT NULL REFERENCES trial_codes(id) ON DELETE CASCADE,
  studio_id UUID REFERENCES studios(id) ON DELETE SET NULL,
  email TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_code_redemptions_code
  ON trial_code_redemptions(trial_code_id, redeemed_at DESC);

ALTER TABLE trial_code_redemptions ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: service-role access only, same as trial_codes.

-- Carry over anything minted under 025 (codes were single-use by definition).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trial_codes' AND column_name = 'redeemed_at'
  ) THEN
    EXECUTE $mig$
      INSERT INTO trial_code_redemptions (trial_code_id, studio_id, email, redeemed_at)
      SELECT id, redeemed_by_studio_id, redeemed_email, redeemed_at
        FROM trial_codes
       WHERE redeemed_at IS NOT NULL
    $mig$;
    EXECUTE 'UPDATE trial_codes SET max_uses = 1, use_count = CASE WHEN redeemed_at IS NULL THEN 0 ELSE 1 END';
    EXECUTE 'ALTER TABLE trial_codes DROP COLUMN redeemed_at, DROP COLUMN redeemed_by_studio_id, DROP COLUMN redeemed_email';
  END IF;
END $$;

-- Claim one use atomically. Returns false when the code is exhausted or
-- expired, which is what stops a shared link from over-issuing trials under
-- concurrent signups.
CREATE OR REPLACE FUNCTION claim_trial_code(
  p_code_id UUID,
  p_studio_id UUID,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed BOOLEAN;
BEGIN
  UPDATE trial_codes
     SET use_count = use_count + 1
   WHERE id = p_code_id
     AND (max_uses IS NULL OR use_count < max_uses)
     AND (expires_at IS NULL OR expires_at > now())
  RETURNING TRUE INTO v_claimed;

  IF v_claimed IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO trial_code_redemptions (trial_code_id, studio_id, email)
  VALUES (p_code_id, p_studio_id, p_email);

  RETURN TRUE;
END;
$$;

-- Give a use back when the signup that claimed it is rolled back. Removes
-- exactly one redemption (the most recent match) so a rollback can never
-- clear redemptions belonging to other signups.
CREATE OR REPLACE FUNCTION release_trial_code(p_code_id UUID, p_studio_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted UUID;
BEGIN
  DELETE FROM trial_code_redemptions
   WHERE id = (
     SELECT id
       FROM trial_code_redemptions
      WHERE trial_code_id = p_code_id
        AND studio_id IS NOT DISTINCT FROM p_studio_id
      ORDER BY redeemed_at DESC
      LIMIT 1
   )
  RETURNING id INTO v_deleted;

  IF v_deleted IS NULL THEN
    RETURN;
  END IF;

  UPDATE trial_codes
     SET use_count = GREATEST(use_count - 1, 0)
   WHERE id = p_code_id;
END;
$$;

REVOKE ALL ON FUNCTION claim_trial_code(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_trial_code(UUID, UUID) FROM PUBLIC, anon, authenticated;

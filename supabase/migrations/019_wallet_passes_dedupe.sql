-- Enforce one active/installed wallet pass per (customer, platform).
-- Re-downloads should reuse an existing pass row instead of inserting a new one.
-- This migration voids leftover duplicates and adds a partial unique index so
-- the bug cannot silently reappear.

BEGIN;

-- 1. Void duplicate active/installed passes, keeping the most recently updated
--    row per (customer_id, platform). Tie-break on created_at, then id.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id, platform
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
    ) AS rn
  FROM wallet_passes
  WHERE status IN ('active', 'installed')
)
UPDATE wallet_passes
SET status = 'voided',
    updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Prevent future duplicates at the DB layer.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_passes_unique_active_per_customer_platform
  ON wallet_passes(customer_id, platform)
  WHERE status IN ('active', 'installed');

COMMIT;

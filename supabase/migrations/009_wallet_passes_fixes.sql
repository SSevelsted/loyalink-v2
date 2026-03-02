-- Expand status constraint to include installed/uninstalled states
ALTER TABLE wallet_passes DROP CONSTRAINT IF EXISTS wallet_passes_status_check;
ALTER TABLE wallet_passes ADD CONSTRAINT wallet_passes_status_check
  CHECK (status IN ('active', 'installed', 'uninstalled', 'voided', 'expired'));

-- Add installed_at column
ALTER TABLE wallet_passes ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ;

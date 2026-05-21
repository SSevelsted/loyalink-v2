-- Legacy PassKit/Lovable bridge mappings.
-- This keeps migrated wallet cards opt-in per studio and out of the core
-- customer identity model.
CREATE TABLE IF NOT EXISTS legacy_loyalty_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'passkit_lovable',
  legacy_project TEXT NOT NULL DEFAULT 'lovable',
  legacy_studio_id TEXT NOT NULL,
  legacy_customer_id UUID,
  legacy_member_id TEXT NOT NULL,
  legacy_passkit_id TEXT,
  legacy_barcode_payload TEXT,
  legacy_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, provider, legacy_studio_id, legacy_member_id),
  UNIQUE (customer_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_legacy_loyalty_links_studio
  ON legacy_loyalty_links(studio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_loyalty_links_customer
  ON legacy_loyalty_links(customer_id);

CREATE INDEX IF NOT EXISTS idx_legacy_loyalty_links_passkit
  ON legacy_loyalty_links(legacy_passkit_id)
  WHERE legacy_passkit_id IS NOT NULL;

ALTER TABLE legacy_loyalty_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legacy_loyalty_links_select" ON legacy_loyalty_links
  FOR SELECT USING (
    studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin()
  );

-- Inserts/updates are performed from server-side routes with the service role.

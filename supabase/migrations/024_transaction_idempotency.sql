-- Idempotency keys for POST /api/v1/transactions.
-- processTransaction never inserts a row for the purchase itself — only the
-- derived 'cashback' / 'referral_commission' rows — so replay detection needs
-- dedicated storage. One row per (studio, key): a completed row stores the
-- processTransaction result verbatim, and a replayed request gets that result
-- back instead of re-crediting the member.
CREATE TABLE IF NOT EXISTS transaction_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (studio_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_txn_idempotency_customer
  ON transaction_idempotency_keys(customer_id);

ALTER TABLE transaction_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: rows are only touched by API routes through the
-- service role. RLS enabled with zero policies keeps the table invisible to
-- anon/authenticated clients.

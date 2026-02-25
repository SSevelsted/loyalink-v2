-- 004_foundation_fixes.sql
-- Fix transaction type constraint and drop orphaned table

-- 1. Allow 'referral_commission' in transactions.type
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('credit', 'debit', 'adjustment', 'cashback', 'referral_commission'));

-- 2. Drop orphaned cashback_tiers table (all tier data lives in pass_templates.tier_themes JSONB)
DROP POLICY IF EXISTS "cashback_tiers_select" ON cashback_tiers;
DROP POLICY IF EXISTS "cashback_tiers_insert" ON cashback_tiers;
DROP POLICY IF EXISTS "cashback_tiers_update" ON cashback_tiers;
DROP POLICY IF EXISTS "cashback_tiers_delete" ON cashback_tiers;
DROP TABLE IF EXISTS cashback_tiers;

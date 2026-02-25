-- ============================================================
-- 006: Admin helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION admin_platform_stats()
RETURNS JSON AS $$
BEGIN
  IF NOT is_super_admin() THEN RETURN '{}'::JSON; END IF;
  RETURN (SELECT json_build_object(
    'transaction_volume', COALESCE((SELECT SUM(ABS(amount)) FROM transactions), 0),
    'transaction_count', (SELECT COUNT(*) FROM transactions),
    'customer_count', (SELECT COUNT(*) FROM customers),
    'studio_count', (SELECT COUNT(*) FROM studios),
    'active_pass_count', (SELECT COUNT(*) FROM wallet_passes WHERE status = 'active'),
    'campaign_count', (SELECT COUNT(*) FROM push_campaigns WHERE status = 'completed')
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

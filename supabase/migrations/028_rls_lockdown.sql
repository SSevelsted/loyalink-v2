-- RLS lockdown: no table is readable or writable with the anon key alone.
--
-- The anon key ships in the browser bundle. Before this migration these
-- policies let anyone with that key:
--   customers                    read every customer in every studio (2 policies;
--                                "referral_code IS NOT NULL" matched nearly every row)
--   referrals                    read, insert, update and delete every referral
--                                ("Service role full access" was granted to PUBLIC)
--   wallet_device_registrations  read and write every Apple Wallet push token
--   invitations                  read every invitation and its token
--   studios                      read every studio row (Stripe ids, settings)
--   studio_landing_pages         read every landing page
--
-- After it:
--   * service_role bypasses RLS, so every server route, cron and the pass
--     service (all use SUPABASE_SERVICE_ROLE_KEY) keep working unchanged.
--   * Staff (authenticated) see only rows of studios they belong to, through
--     the existing current_user_studio_ids() / is_super_admin() helpers.
--   * Public pages (join, refer, invite, loyalty, pass, referral-success)
--     read through server code with the service key, never with anon.
--   * anon loses its table grants in schema public as a second wall: a future
--     "USING (true)" policy can no longer leak data on its own.
--
-- DEPLOY ORDER: deploy the app code of this PR first, then apply this file.
-- The old code reads landing pages, studios, customers and invitations with
-- the anon key; applied first, this migration breaks /join, /refer and /invite.

BEGIN;

-- ---------------------------------------------------------------------------
-- customers: staff policies (customers_select/insert/update/delete) stay.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS customers_anon_select_by_id ON customers;
DROP POLICY IF EXISTS customers_anon_select_by_referral_code ON customers;

-- ---------------------------------------------------------------------------
-- referrals: no anon/public access; staff read their own studio's rows.
-- All writes happen server-side with the service key.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role full access on referrals" ON referrals;
DROP POLICY IF EXISTS referrals_anon_select ON referrals;

CREATE POLICY referrals_select ON referrals
  FOR SELECT TO authenticated
  USING (studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin());

-- ---------------------------------------------------------------------------
-- wallet_device_registrations: written only by the pass service (service key).
-- Staff may read the devices of their own studio's passes (wallet page).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS device_reg_all ON wallet_device_registrations;

CREATE POLICY device_reg_select ON wallet_device_registrations
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR serial_number IN (
      SELECT wp.serial_number FROM wallet_passes wp
      WHERE wp.studio_id IN (SELECT current_user_studio_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- invitations: the invite page now looks a token up through
-- POST /api/invitations/lookup (service key, exact token match).
-- Staff policies (invitations_select/insert/update) stay.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS invitations_select_by_token ON invitations;

-- ---------------------------------------------------------------------------
-- studios: no anon read. Public pages read the studio name/settings through
-- server code with the service key. studios_select (members) stays.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS studios_anon_select ON studios;

-- ---------------------------------------------------------------------------
-- studio_landing_pages: public pages read them server-side by slug; the
-- dashboard reads its own studio's pages. view_count/signup_count are
-- business numbers, so no blanket read.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS landing_pages_select ON studio_landing_pages;
DROP POLICY IF EXISTS studio_landing_pages_anon_select ON studio_landing_pages;

CREATE POLICY landing_pages_select ON studio_landing_pages
  FOR SELECT TO authenticated
  USING (studio_id IN (SELECT current_user_studio_ids()) OR is_super_admin());

-- ---------------------------------------------------------------------------
-- Second wall: anon has no table privileges in schema public.
-- Supabase grants ALL on every public table to anon by default. No app code
-- path queries a public table with the anon role after this PR (auth calls go
-- to the auth schema; storage reads go to the storage schema).
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- admin_platform_stats returns '{}' to non-admins, but anon has no reason to call it.
REVOKE EXECUTE ON FUNCTION admin_platform_stats() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION admin_platform_stats() TO authenticated;

COMMIT;

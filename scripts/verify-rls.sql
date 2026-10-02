-- Verify RLS after 028_rls_lockdown. Read-only: every query is a SELECT,
-- and the role check runs in a READ ONLY transaction that rolls back.
--
-- Expected result after the migration:
--   1. tables_without_rls            -> 0 rows
--   2. open_policies                 -> 0 rows
--   3. anon_table_grants             -> 0 rows
--   4. anon_visible_rows             -> every count is 0 (or "permission denied")
--   5. anon_executable_definer_funcs -> only is_super_admin, current_user_studio_ids
--                                      (both return nothing without auth.uid())

-- 1. Tables in public with RLS switched off.
SELECT c.relname AS tables_without_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
ORDER BY 1;

-- 2. Policies that let anon / public through with a constant-true or
--    auth-free condition. Staff policies all call auth.uid() through
--    current_user_studio_ids() / is_super_admin() or reference studio_members.
SELECT tablename AS open_policy_table, policyname, roles::text, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND roles && ARRAY['anon', 'public']::name[]
  AND coalesce(qual, '') !~ '(current_user_studio_ids|is_super_admin|auth\.uid|studio_members)'
  AND coalesce(with_check, '') !~ '(current_user_studio_ids|is_super_admin|auth\.uid|studio_members)'
  -- Intended: the studio-assets bucket is public (logos, hero images).
  AND NOT (schemaname = 'storage' AND policyname = 'Public can read studio assets')
ORDER BY 1, 2;

-- 3. Table / sequence privileges anon still holds in public.
SELECT table_name AS anon_table_grants, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee = 'anon'
GROUP BY 1
ORDER BY 1;

-- 4. What the anon key can actually see. Run as one statement batch;
--    with the grants revoked this raises "permission denied" (also a pass).
BEGIN TRANSACTION READ ONLY;
SET LOCAL ROLE anon;
SELECT
  (SELECT count(*) FROM customers)                   AS customers,
  (SELECT count(*) FROM referrals)                   AS referrals,
  (SELECT count(*) FROM wallet_device_registrations) AS device_registrations,
  (SELECT count(*) FROM invitations)                 AS invitations,
  (SELECT count(*) FROM studios)                     AS studios,
  (SELECT count(*) FROM studio_landing_pages)        AS landing_pages,
  (SELECT count(*) FROM transactions)                AS transactions,
  (SELECT count(*) FROM wallet_passes)               AS wallet_passes;
ROLLBACK;

-- 5. SECURITY DEFINER functions anon can execute.
SELECT p.proname AS anon_executable_definer_funcs, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'execute')
ORDER BY 1;

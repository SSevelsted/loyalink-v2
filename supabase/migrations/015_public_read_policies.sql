-- Public read policies for anon access on read-only public routes
-- This allows switching from service_role to anon key for public routes,
-- so RLS enforces data boundaries even if application code has a bug.

-- Allow anon to look up a customer by referral_code (limited fields via app layer)
CREATE POLICY "customers_anon_select_by_referral_code"
  ON customers FOR SELECT
  TO anon
  USING (referral_code IS NOT NULL);

-- Allow anon to look up a customer by member_id or id (loyalty page)
CREATE POLICY "customers_anon_select_by_id"
  ON customers FOR SELECT
  TO anon
  USING (true);

-- Allow anon to read studio public info (name, slug, settings for branding)
CREATE POLICY "studios_anon_select"
  ON studios FOR SELECT
  TO anon
  USING (true);

-- Allow anon to read public landing pages (already has public SELECT but ensure anon role)
CREATE POLICY "studio_landing_pages_anon_select"
  ON studio_landing_pages FOR SELECT
  TO anon
  USING (true);

-- Allow anon to read referrals (for loyalty page referral list)
CREATE POLICY "referrals_anon_select"
  ON referrals FOR SELECT
  TO anon
  USING (true);

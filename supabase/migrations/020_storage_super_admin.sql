-- Storage uploads for super admins
--
-- The studio-assets storage policies (migration 002) only allowed uploads to a
-- studio folder when the user had a studio_members row for that studio. Every
-- table-level RLS policy grants super admins access with `OR is_super_admin()`,
-- but the storage policies were never given the same bypass. As a result a
-- super admin editing a studio they don't belong to (e.g. via the studio
-- switcher / onboarding) had their logo/icon uploads silently denied — the
-- upload returned null and the image box reverted to empty.
--
-- Recreate the INSERT and UPDATE policies with the super-admin bypass so they
-- match the rest of the schema. Public read (SELECT) is unchanged.

DROP POLICY IF EXISTS "Studio members can upload assets" ON storage.objects;
CREATE POLICY "Studio members can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-assets'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT s.id::text FROM studios s
      JOIN studio_members sm ON sm.studio_id = s.id
      WHERE sm.user_id = auth.uid()
    )
    OR is_super_admin()
  )
);

DROP POLICY IF EXISTS "Studio members can update assets" ON storage.objects;
CREATE POLICY "Studio members can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'studio-assets'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT s.id::text FROM studios s
      JOIN studio_members sm ON sm.studio_id = s.id
      WHERE sm.user_id = auth.uid()
    )
    OR is_super_admin()
  )
);

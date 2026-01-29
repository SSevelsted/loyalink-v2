-- Create studio-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-assets', 'studio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their studio folder
CREATE POLICY "Studio members can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM studios s
    JOIN studio_members sm ON sm.studio_id = s.id
    WHERE sm.user_id = auth.uid()
  )
);

-- Allow authenticated users to update their studio assets
CREATE POLICY "Studio members can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'studio-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM studios s
    JOIN studio_members sm ON sm.studio_id = s.id
    WHERE sm.user_id = auth.uid()
  )
);

-- Allow public read access to studio assets
CREATE POLICY "Public can read studio assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'studio-assets');

-- Function to seed default pass template for a studio
CREATE OR REPLACE FUNCTION seed_default_template(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO pass_templates (studio_id, name, is_active, tier_themes, card_fields, static_texts, barcode_format)
  VALUES (
    p_studio_id,
    'Default Pass',
    true,
    '{
      "base": {"name": "Base", "backgroundColor": "#FFFFFF", "foregroundColor": "#000000", "labelColor": "#666666", "stripImage": null, "cashbackRate": 0, "minSpend": 0, "sortOrder": 0},
      "loyalty_club": {"name": "Loyalty Club", "backgroundColor": "#1A1A1A", "foregroundColor": "#FFFFFF", "labelColor": "#AAAAAA", "stripImage": null, "cashbackRate": 5, "minSpend": 100, "sortOrder": 1},
      "referral_1": {"name": "Referral Bronze", "backgroundColor": "#F5A623", "foregroundColor": "#FFFFFF", "labelColor": "#FFF5E0", "stripImage": null, "cashbackRate": 3, "minSpend": 0, "sortOrder": 2},
      "referral_2": {"name": "Referral Silver", "backgroundColor": "#C0C0C0", "foregroundColor": "#1A1A1A", "labelColor": "#444444", "stripImage": null, "cashbackRate": 5, "minSpend": 0, "sortOrder": 3},
      "referral_3": {"name": "Referral Gold", "backgroundColor": "#FFD700", "foregroundColor": "#1A1A1A", "labelColor": "#444444", "stripImage": null, "cashbackRate": 8, "minSpend": 0, "sortOrder": 4},
      "inner_circle": {"name": "Inner Circle", "backgroundColor": "#4A7C59", "foregroundColor": "#FFFFFF", "labelColor": "#D4E8DB", "stripImage": null, "cashbackRate": 10, "minSpend": 500, "sortOrder": 5}
    }'::jsonb,
    '[
      {"key": "member", "label": "MEMBER", "value": "[displayName]"},
      {"key": "balance", "label": "BALANCE", "value": "[balance]"},
      {"key": "tier", "label": "TIER", "value": "[name]"},
      {"key": "cashback", "label": "Loyalty Cash Back Deal", "value": "[cashbackRate]%"}
    ]'::jsonb,
    '{
      "referralText": "Refer Friends. Both Earn Cashback.",
      "howItWorks": "1. Scan. Earn. Repeat...",
      "personalAnnouncement": "[personalAnnouncement]",
      "announcement": "[announcement]"
    }'::jsonb,
    'PKBarcodeFormatQR'
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Device tokens for native push notifications (APNs / FCM)
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own device tokens
CREATE POLICY "device_tokens_select" ON device_tokens FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "device_tokens_insert" ON device_tokens FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "device_tokens_update" ON device_tokens FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "device_tokens_delete" ON device_tokens FOR DELETE USING (
  auth.uid() = user_id
);

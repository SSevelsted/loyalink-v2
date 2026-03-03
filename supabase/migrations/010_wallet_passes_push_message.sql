-- Add push_message column to wallet_passes so campaigns can send
-- arbitrary notifications without requiring a balance/cashback change.
-- The pass includes this as a back field with changeMessage: '%@',
-- meaning the field value becomes the notification text verbatim.
ALTER TABLE wallet_passes ADD COLUMN IF NOT EXISTS push_message TEXT;

-- Member link token version.
-- The links StreamInk sends (API invite_link) and the pass back-field link
-- carry a signed member link token with no expiry. The token holds this
-- version; rotating the link (POST /api/v1/members/{id}/link-token) bumps it,
-- so every older link stops opening the member's balance and activity.
-- Existing rows start at 1, which is what the app assumes when the column is
-- missing.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS link_token_version INTEGER NOT NULL DEFAULT 1 CHECK (link_token_version > 0);

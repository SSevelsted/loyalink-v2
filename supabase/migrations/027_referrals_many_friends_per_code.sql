-- One referral code, many friends.
-- referrals.referral_code holds the REFERRER's code, so UNIQUE (studio_id,
-- referral_code) allowed each member to refer only one friend: the second
-- friend's referral insert failed and the friend joined with no referrer.
-- A friend can still be referred only once (UNIQUE (referred_customer_id)
-- stays). The plain index keeps code lookups as fast as the unique one did.

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_studio_id_referral_code_key;

CREATE INDEX IF NOT EXISTS idx_referrals_studio_code ON referrals(studio_id, referral_code);

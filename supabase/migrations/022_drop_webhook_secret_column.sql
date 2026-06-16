-- Contract phase of removing webhook signing (see migration 021, which made the
-- column nullable). The unsigned-webhook code is fully deployed and no longer
-- reads or writes studio_webhooks.secret, so the column can now be dropped.
ALTER TABLE studio_webhooks DROP COLUMN IF EXISTS secret;

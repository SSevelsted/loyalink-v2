-- Webhooks are no longer signed. Deliveries carry no secret or HMAC signature;
-- receivers simply trust POSTs to the endpoint URL they configured. Drop the
-- now-unused secret column. SSRF protection (private-URL blocking) still applies
-- at the application layer.
ALTER TABLE studio_webhooks DROP COLUMN IF EXISTS secret;

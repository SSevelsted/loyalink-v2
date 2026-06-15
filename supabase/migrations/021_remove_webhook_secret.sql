-- Webhooks are no longer signed. Deliveries carry no secret or HMAC signature;
-- receivers simply trust POSTs to the endpoint URL they configured. SSRF
-- protection (private-URL blocking) still applies at the application layer.
--
-- Expand/contract: only drop NOT NULL here so the old (signing) and new (unsigned)
-- code can coexist during rollout — old code still writes a secret, new code omits
-- it and the column accepts NULL. A follow-up migration drops the column entirely
-- once no running code references it.
ALTER TABLE studio_webhooks ALTER COLUMN secret DROP NOT NULL;

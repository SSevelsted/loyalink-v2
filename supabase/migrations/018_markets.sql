-- Markets: per-customer native currency + language + originating landing page.
--
-- A "market" = a landing page + currency + language. A customer self-selects
-- their market by which landing page they joined through, and their card lives
-- in that currency/language for life. Currencies are siloed per customer and
-- never summed across, so no FX/exchange rates are needed.
--
-- These columns are nullable: existing customers (and any created without a
-- landing page) fall back to the studio's currency/language at render time.

alter table customers
  add column if not exists currency text,
  add column if not exists language text,
  add column if not exists landing_page_id uuid references studio_landing_pages(id) on delete set null;

-- Notification targeting ("ping everyone in my Berlin market") filters by landing page.
create index if not exists idx_customers_landing_page on customers(landing_page_id);

-- Per-currency dashboard aggregation groups financial metrics by (studio, currency).
create index if not exists idx_customers_studio_currency on customers(studio_id, currency);

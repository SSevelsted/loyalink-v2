-- customers.member_id was never written by any insert path, so every row had
-- NULL and public links (/loyalty, /refer, onboarding invite_link) fell back to
-- the long UUID instead of a short id. Add a DB-level default so all insert
-- paths (present and future) get one automatically, and backfill existing rows.

-- Generate a short, URL-safe, unambiguous id (no 0/1/i/l/o), mirroring the
-- referral_code alphabet style. 31^12 keyspace — collisions are negligible and
-- the UNIQUE index on member_id is the backstop.
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet text := '23456789abcdefghjkmnpqrstuvwxyz';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill existing rows. The function is VOLATILE, so it is evaluated once per
-- row (each gets a distinct value).
UPDATE customers SET member_id = generate_member_id() WHERE member_id IS NULL;

-- New rows get a member_id automatically when the column is not supplied.
ALTER TABLE customers ALTER COLUMN member_id SET DEFAULT generate_member_id();

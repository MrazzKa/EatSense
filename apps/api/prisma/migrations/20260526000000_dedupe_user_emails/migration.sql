-- Dedupe user emails that diverge only by case, and lowercase all remaining
-- emails so future case-insensitive lookups always hit.
--
-- Root cause: at some point in history, normalizeEmail() (trim + toLowerCase)
-- was not consistently applied before persisting, so users created via
-- different code paths ended up with mixed-case emails. The unique index on
-- `users.email` is case-sensitive (Postgres `text`), so `Foo@example.com`
-- and `foo@example.com` coexist as two distinct accounts. A returning user
-- whose runtime input gets normalized to all-lowercase lands on a fresh row
-- and loops back into onboarding.
--
-- This migration:
--   1. Finds groups of users whose `LOWER(email)` collide.
--   2. For each group keeps the OLDEST user untouched (their profile +
--      onboarding state is the canonical one).
--   3. Suffixes every other duplicate's email with `+dup-<userId>` so the
--      account is preserved but no longer reachable via email login.
--   4. Lowercases ALL emails so subsequent inserts via the (case-insensitive)
--      lookup logic don't collide with legacy mixed-case rows.

DO $$
DECLARE
  dup RECORD;
BEGIN
  -- Step 1+2+3: Suffix duplicates (keep oldest)
  FOR dup IN
    SELECT
      id,
      email,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(email)
        ORDER BY "created_at" ASC, id ASC
      ) AS rn
    FROM "users"
  LOOP
    IF dup.rn > 1 THEN
      UPDATE "users"
      SET email = SPLIT_PART(dup.email, '@', 1) || '+dup-' || dup.id || '@' || NULLIF(SPLIT_PART(dup.email, '@', 2), '')
      WHERE id = dup.id;
    END IF;
  END LOOP;

  -- Step 4: Lowercase all remaining emails. Safe now because duplicates are
  -- already suffixed and no longer collide.
  UPDATE "users" SET email = LOWER(email) WHERE email <> LOWER(email);
END$$;

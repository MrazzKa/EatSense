#!/usr/bin/env bash
#
# infomaniak-migrate.sh — ZERO-RISK helper to copy the EatSense Postgres database
# from the current host (Railway) to an Infomaniak Managed PostgreSQL, as prep for
# "Swiss data in Switzerland".  See docs/plans/2026-07-08-swiss-data-infomaniak.md.
#
# ─────────────────────────────────────────────────────────────────────────────
#  THIS SCRIPT IS NEVER RUN AUTOMATICALLY.
#  - It is NOT referenced by start:railway, the Dockerfile, or any CI.
#  - It only READS from the source DB (pg_dump) and WRITES to the target DB.
#  - Nothing here touches the running Railway service or its traffic.
#  - Run it by hand, only once the Infomaniak DB is provisioned and you've decided
#    to migrate (i.e. after the boss confirms the driver).
# ─────────────────────────────────────────────────────────────────────────────
#
#  WHY the API needs NO code changes to run on Infomaniak:
#   Railway already builds the repo's root ./Dockerfile and starts it with
#   `pnpm --filter ./apps/api run start:railway` (see railway.json). That same
#   image runs anywhere Docker runs. On Infomaniak you deploy the SAME image and
#   set the SAME env vars, only pointing DATABASE_URL at the Infomaniak Postgres.
#   `start:railway` runs `prisma migrate deploy` (a no-op on a restored DB, since
#   the migration history is copied) + idempotent seeds, then `node dist/main.js`.
#
#  USAGE:
#     export SOURCE_DATABASE_URL="postgres://...railway..."      # read-only source
#     export TARGET_DATABASE_URL="postgres://...infomaniak..."   # fresh CH database
#     bash apps/api/scripts/infomaniak-migrate.sh
#
#  REQUIREMENTS: pg_dump / pg_restore / psql (Postgres client tools) on your machine,
#  matching the server's major version. Check the source version first:
#     psql "$SOURCE_DATABASE_URL" -c "SELECT version();"
#
set -euo pipefail

DUMP_FILE="${DUMP_FILE:-eatsense-$(date +%Y%m%d-%H%M%S).dump}"

if [[ -z "${SOURCE_DATABASE_URL:-}" || -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "ERROR: set SOURCE_DATABASE_URL and TARGET_DATABASE_URL first." >&2
  echo "       (SOURCE = current Railway DB, TARGET = new Infomaniak DB)" >&2
  exit 1
fi

echo "==> 1/4  Dumping SOURCE (read-only) → ${DUMP_FILE}"
pg_dump "$SOURCE_DATABASE_URL" -Fc --no-owner --no-privileges -f "$DUMP_FILE"
echo "    dump size: $(du -h "$DUMP_FILE" | cut -f1)"

echo "==> 2/4  Restoring into TARGET (Infomaniak)"
# --clean --if-exists makes the restore repeatable into a non-empty target.
# Only the TARGET is ever written to.
pg_restore -d "$TARGET_DATABASE_URL" --no-owner --no-privileges --clean --if-exists "$DUMP_FILE"

echo "==> 3/4  Verifying row counts (source vs target)"
# Adjust the table list if the schema grows. Mismatches here = DO NOT cut over.
TABLES=("users" "user_profiles" "meals" "user_subscriptions" "analyses")
printf "    %-22s %12s %12s\n" "table" "source" "target"
for t in "${TABLES[@]}"; do
  src=$(psql "$SOURCE_DATABASE_URL" -tAc "SELECT count(*) FROM \"$t\";" 2>/dev/null || echo "n/a")
  tgt=$(psql "$TARGET_DATABASE_URL" -tAc "SELECT count(*) FROM \"$t\";" 2>/dev/null || echo "n/a")
  flag=""; [[ "$src" != "$tgt" ]] && flag="  <-- MISMATCH"
  printf "    %-22s %12s %12s%s\n" "$t" "$src" "$tgt" "$flag"
done

echo "==> 4/4  Sanity: prisma migrate status against TARGET should be up-to-date."
echo "    Run from apps/api:  DATABASE_URL=\"\$TARGET_DATABASE_URL\" npx prisma migrate status"
echo ""
echo "Done. Next: deploy the SAME API image to Infomaniak with DATABASE_URL=TARGET,"
echo "smoke-test it, then flip DNS (api.eatsense.ch). Keep Railway warm 48–72h for rollback."

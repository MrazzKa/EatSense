-- GDPR data-access requests.
--
-- The app used to build the export itself and hand the file straight to the user.
-- That was changed so every copy of personal data leaves the company through us:
-- the user files a request, we generate the file in the admin panel and email it.
--
-- `requested_at` carries a legal deadline, not just an audit timestamp: GDPR
-- Art. 12(3) gives one month to answer. The index on (status, requested_at) is
-- what the admin queue sorts by, oldest pending first.
--
-- Idempotent: safe to run on a clean DB and on prod.

CREATE TABLE IF NOT EXISTS "data_export_requests" (
  "id"           TEXT         NOT NULL,
  "user_id"      TEXT         NOT NULL,
  "email"        TEXT         NOT NULL,
  "status"       TEXT         NOT NULL DEFAULT 'pending',
  "source"       TEXT         NOT NULL DEFAULT 'app',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fulfilled_at" TIMESTAMP(3),
  "note"         TEXT,

  CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_export_requests_status_requested_at_idx"
  ON "data_export_requests" ("status", "requested_at");
CREATE INDEX IF NOT EXISTS "data_export_requests_user_id_requested_at_idx"
  ON "data_export_requests" ("user_id", "requested_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'data_export_requests_user_id_fkey') THEN
    ALTER TABLE "data_export_requests"
      ADD CONSTRAINT "data_export_requests_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

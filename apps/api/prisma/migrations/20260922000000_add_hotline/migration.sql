-- Hotline: duty shifts, presence, and the queue of people waiting to talk.
--
-- Shifts are their own table rather than a reuse of expert_availability, because
-- a bookable slot and "I am answering whoever shows up right now" are different
-- promises and an expert needs to be able to offer one without the other.
--
-- Idempotent: safe to run on a clean DB and on prod.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HotlineRequestStatus') THEN
    CREATE TYPE "HotlineRequestStatus" AS ENUM ('WAITING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');
  END IF;
END
$$;

ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "hotline_enabled"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "hotline_online_until" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "hotline_shifts" (
  "id"           TEXT         NOT NULL,
  "expert_id"    TEXT         NOT NULL,
  "weekday"      INTEGER      NOT NULL,
  "start_minute" INTEGER      NOT NULL,
  "end_minute"   INTEGER      NOT NULL,
  "timezone"     TEXT         NOT NULL,
  "is_active"    BOOLEAN      NOT NULL DEFAULT true,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hotline_shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hotline_requests" (
  "id"                TEXT                   NOT NULL,
  "client_id"         TEXT                   NOT NULL,
  "status"            "HotlineRequestStatus" NOT NULL DEFAULT 'WAITING',
  "reason"            TEXT,
  "symptom_report_id" TEXT,
  "locale"            TEXT,
  "expert_id"         TEXT,
  "conversation_id"   TEXT,
  "accepted_at"       TIMESTAMP(3),
  "closed_at"         TIMESTAMP(3),
  "expires_at"        TIMESTAMP(3)           NOT NULL,
  "created_at"        TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hotline_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hotline_shifts_expert_id_weekday_idx"   ON "hotline_shifts" ("expert_id", "weekday");
CREATE INDEX IF NOT EXISTS "hotline_shifts_weekday_is_active_idx"   ON "hotline_shifts" ("weekday", "is_active");
CREATE INDEX IF NOT EXISTS "hotline_requests_status_created_at_idx" ON "hotline_requests" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "hotline_requests_client_id_status_idx"  ON "hotline_requests" ("client_id", "status");
CREATE INDEX IF NOT EXISTS "hotline_requests_expert_id_status_idx"  ON "hotline_requests" ("expert_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotline_shifts_expert_id_fkey') THEN
    ALTER TABLE "hotline_shifts" ADD CONSTRAINT "hotline_shifts_expert_id_fkey"
      FOREIGN KEY ("expert_id") REFERENCES "expert_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotline_requests_client_id_fkey') THEN
    ALTER TABLE "hotline_requests" ADD CONSTRAINT "hotline_requests_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotline_requests_expert_id_fkey') THEN
    ALTER TABLE "hotline_requests" ADD CONSTRAINT "hotline_requests_expert_id_fkey"
      FOREIGN KEY ("expert_id") REFERENCES "expert_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

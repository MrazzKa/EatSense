-- Apple Health / Health Connect daily activity, pushed up by the app.
--
-- HealthKit and Health Connect are device-only APIs: the server can never read
-- them itself, so the app syncs a daily rollup here. This is what lets the daily
-- calorie target follow real activity instead of a static questionnaire answer,
-- and what a linked expert sees (only with explicit consent).
--
-- Every metric is nullable — users grant permissions selectively, and a missing
-- metric is normal rather than an error.
--
-- Idempotent: safe to run on a clean DB and on prod.

CREATE TABLE IF NOT EXISTS "health_daily_metrics" (
  "id"                  TEXT         NOT NULL,
  "userId"              TEXT         NOT NULL,
  -- Local calendar day, YYYY-MM-DD, not a timestamp.
  "date"                TEXT         NOT NULL,
  "steps"               INTEGER,
  "active_energy_kcal"  INTEGER,
  "resting_energy_kcal" INTEGER,
  "workout_minutes"     INTEGER,
  "sleep_minutes"       INTEGER,
  "resting_heart_rate"  INTEGER,
  "source"              TEXT         NOT NULL,
  "synced_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "health_daily_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "health_daily_metrics_userId_date_key" ON "health_daily_metrics" ("userId", "date");
CREATE INDEX IF NOT EXISTS "health_daily_metrics_userId_date_idx"        ON "health_daily_metrics" ("userId", "date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'health_daily_metrics_userId_fkey') THEN
    ALTER TABLE "health_daily_metrics"
      ADD CONSTRAINT "health_daily_metrics_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

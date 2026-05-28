-- Smart notifications v2: exact local time, locale, and delivery audit log.
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "smart_tips_minute" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "smart_tips_medical_allowed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "notification_delivery_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT,
  "template_key" TEXT,
  "local_date" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "scheduled_for_utc" TIMESTAMP(3) NOT NULL,
  "sent_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "ticket_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "receipt_checked_at" TIMESTAMP(3),
  "error_code" TEXT,
  "error_message" TEXT,
  "reaction" TEXT,
  "reacted_at" TIMESTAMP(3),
  "payload_preview" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_delivery_logs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "notification_delivery_logs"
    ADD CONSTRAINT "notification_delivery_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "notification_delivery_logs_userId_type_local_date_key"
  ON "notification_delivery_logs"("userId", "type", "local_date");

CREATE INDEX IF NOT EXISTS "notification_delivery_logs_status_scheduled_for_utc_idx"
  ON "notification_delivery_logs"("status", "scheduled_for_utc");

CREATE INDEX IF NOT EXISTS "notification_delivery_logs_userId_created_at_idx"
  ON "notification_delivery_logs"("userId", "created_at");

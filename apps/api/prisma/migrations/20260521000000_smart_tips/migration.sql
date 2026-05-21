-- Smart tips: opt-in personalised notifications based on user-declared health issues.
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "smart_tips_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "smart_tips_hour" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "health_issues" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "smart_tips_last_sent_at" TIMESTAMP(3);
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "smart_tips_last_category" TEXT;

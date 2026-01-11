-- Add dailyPushMinute column to notification_preferences
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "dailyPushMinute" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "celebration_shown" BOOLEAN NOT NULL DEFAULT false;

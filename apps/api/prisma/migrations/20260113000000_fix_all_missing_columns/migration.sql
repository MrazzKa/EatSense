-- Add missing columns to user_diet_programs table safely
-- All columns use IF NOT EXISTS to avoid errors

-- Weight tracking columns
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "start_weight" DOUBLE PRECISION;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "current_weight" DOUBLE PRECISION;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "custom_calories" INTEGER;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "target_weight" DOUBLE PRECISION;

-- Streak tracking columns
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "longest_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "last_streak_date" DATE;

-- Status columns
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3);
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add missing columns to user_diet_daily_logs if needed
ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "celebration_shown" BOOLEAN NOT NULL DEFAULT false;

-- Create diet_program_ratings table if not exists
CREATE TABLE IF NOT EXISTS "diet_program_ratings" (
    "id" TEXT NOT NULL,
    "diet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "weight_lost" DOUBLE PRECISION,
    "duration_weeks" INTEGER,
    "would_recommend" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diet_program_ratings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "diet_program_ratings_diet_id_idx" ON "diet_program_ratings"("diet_id");
CREATE UNIQUE INDEX IF NOT EXISTS "diet_program_ratings_diet_id_user_id_key" ON "diet_program_ratings"("diet_id", "user_id");

-- Add foreign keys only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diet_program_ratings_diet_id_fkey') THEN
        ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diet_program_ratings_user_id_fkey') THEN
        ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

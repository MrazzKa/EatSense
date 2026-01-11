-- Create enum types for diet programs
DO $$ BEGIN
    CREATE TYPE "DietType" AS ENUM ('WEIGHT_LOSS', 'WEIGHT_GAIN', 'HEALTH', 'MEDICAL', 'LIFESTYLE', 'SPORTS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DietDifficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to diet_programs table

-- Type and difficulty (use TEXT first, convert later if needed)
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "type" "DietType" NOT NULL DEFAULT 'HEALTH';
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "short_description" JSONB;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "icon_url" TEXT;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "color" TEXT;

-- UI grouping and evidence
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "ui_group" TEXT;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "evidence_level" TEXT;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "disclaimer_key" TEXT;

-- Nutrition targets
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "daily_calories_min" INTEGER;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "daily_calories_max" INTEGER;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "macro_split" JSONB;

-- Suitability (suitableFor has no @map, so it stays camelCase)
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "suitableFor" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "not_suitable_for" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Food restrictions
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "allowed_foods" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "restricted_foods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Tips, rules, and tracker
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "tips" JSONB;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "rules" JSONB;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "how_it_works" JSONB;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "daily_tracker" JSONB;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "weekly_goals" JSONB;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "not_for" JSONB;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "sample_day" JSONB;

-- Streak settings
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "streak_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- Stats (tags has no @map, so it stays camelCase)
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "popularity_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "user_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "diet_programs" ADD COLUMN IF NOT EXISTS "rating_count" INTEGER NOT NULL DEFAULT 0;

-- Update difficulty column to use enum
ALTER TABLE "diet_programs" ALTER COLUMN "difficulty" SET DEFAULT 'MODERATE';

-- Add indexes
CREATE INDEX IF NOT EXISTS "diet_programs_type_is_active_idx" ON "diet_programs"("type", "is_active");
CREATE INDEX IF NOT EXISTS "diet_programs_popularity_score_idx" ON "diet_programs"("popularity_score");
CREATE INDEX IF NOT EXISTS "diet_programs_ui_group_is_active_idx" ON "diet_programs"("ui_group", "is_active");

-- Add diet_program_ratings table
CREATE TABLE IF NOT EXISTS "diet_program_ratings" (
    "id" TEXT NOT NULL,
    "diet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diet_program_ratings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "diet_program_ratings_diet_id_idx" ON "diet_program_ratings"("diet_id");
CREATE UNIQUE INDEX IF NOT EXISTS "diet_program_ratings_diet_id_user_id_key" ON "diet_program_ratings"("diet_id", "user_id");

DO $$ BEGIN
    ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add user_diet_daily_logs table
CREATE TABLE IF NOT EXISTS "user_diet_daily_logs" (
    "id" TEXT NOT NULL,
    "user_diet_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "day_number" INTEGER NOT NULL,
    "checklist" JSONB DEFAULT '{}',
    "symptoms" JSONB DEFAULT '{}',
    "completion_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_diet_daily_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_diet_daily_logs_date_idx" ON "user_diet_daily_logs"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "user_diet_daily_logs_user_diet_id_date_key" ON "user_diet_daily_logs"("user_diet_id", "date");

DO $$ BEGIN
    ALTER TABLE "user_diet_daily_logs" ADD CONSTRAINT "user_diet_daily_logs_user_diet_id_fkey" FOREIGN KEY ("user_diet_id") REFERENCES "user_diet_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add streak fields to user_diet_programs
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "longest_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "last_streak_date" DATE;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "custom_calories" INTEGER;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "target_weight" DOUBLE PRECISION;
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3);
ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

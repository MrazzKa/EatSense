-- ==================== EXPERTS MARKETPLACE V2 MIGRATION ====================
-- This migration:
-- 1. Adds expertsRole to users
-- 2. Creates expert_profiles table (replaces specialists)
-- 3. Creates expert_credentials table
-- 4. Creates expert_offers table
-- 5. Creates conversations table (replaces consultations)
-- 6. Updates messages table
-- 7. Updates reviews table
-- 8. Creates safety tables (disclaimer_acceptances, abuse_reports, user_blocks)
-- 9. Adds expertId to articles

-- Create enums
DO $$ BEGIN
    CREATE TYPE "UserExpertsRole" AS ENUM ('USER', 'EXPERT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OfferFormat" AS ENUM ('CHAT_CONSULTATION', 'MEAL_PLAN', 'REPORT_REVIEW', 'MONTHLY_SUPPORT', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PriceType" AS ENUM ('FREE', 'FIXED', 'FROM', 'CONTACT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add expertsRole to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "experts_role" "UserExpertsRole" NOT NULL DEFAULT 'USER';

-- ==================== EXPERT PROFILES ====================

CREATE TABLE IF NOT EXISTS "expert_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "education" TEXT,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "contact_policy" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "consultation_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expert_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "expert_profiles_user_id_key" ON "expert_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "expert_profiles_type_is_active_is_published_idx" ON "expert_profiles"("type", "is_active", "is_published");
CREATE INDEX IF NOT EXISTS "expert_profiles_is_verified_is_active_idx" ON "expert_profiles"("is_verified", "is_active");
CREATE INDEX IF NOT EXISTS "expert_profiles_rating_idx" ON "expert_profiles"("rating");

DO $$ BEGIN
    ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== EXPERT CREDENTIALS ====================

CREATE TABLE IF NOT EXISTS "expert_credentials" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "file_url" TEXT,
    "file_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expert_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expert_credentials_expert_id_idx" ON "expert_credentials"("expert_id");

DO $$ BEGIN
    ALTER TABLE "expert_credentials" ADD CONSTRAINT "expert_credentials_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== EXPERT OFFERS ====================

CREATE TABLE IF NOT EXISTS "expert_offers" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "format" "OfferFormat" NOT NULL DEFAULT 'CHAT_CONSULTATION',
    "price_type" "PriceType" NOT NULL DEFAULT 'FREE',
    "price_amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "duration_days" INTEGER,
    "deliverables" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expert_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expert_offers_expert_id_is_published_idx" ON "expert_offers"("expert_id", "is_published");

DO $$ BEGIN
    ALTER TABLE "expert_offers" ADD CONSTRAINT "expert_offers_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== CONVERSATIONS (replaces consultations) ====================

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "offer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reports_shared" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversations_client_id_expert_id_key" ON "conversations"("client_id", "expert_id");
CREATE INDEX IF NOT EXISTS "conversations_client_id_status_idx" ON "conversations"("client_id", "status");
CREATE INDEX IF NOT EXISTS "conversations_expert_id_status_idx" ON "conversations"("expert_id", "status");

DO $$ BEGIN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "expert_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== UPDATE MESSAGES ====================
-- Drop old FK, add new one

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_consultation_id_fkey";
ALTER TABLE "messages" RENAME COLUMN "consultation_id" TO "conversation_id";

DROP INDEX IF EXISTS "messages_consultation_id_created_at_idx";
CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

DO $$ BEGIN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== UPDATE REVIEWS ====================

-- Drop old constraints and FK
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_consultation_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_specialist_id_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_consultation_id_key";

-- Rename columns
ALTER TABLE "reviews" RENAME COLUMN "consultation_id" TO "conversation_id";
ALTER TABLE "reviews" RENAME COLUMN "specialist_id" TO "expert_id";

-- Make conversation_id nullable (reviews can exist without conversation)
ALTER TABLE "reviews" ALTER COLUMN "conversation_id" DROP NOT NULL;

-- Add new columns
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_visible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add new constraints
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_conversation_id_key" ON "reviews"("conversation_id") WHERE "conversation_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_client_id_expert_id_key" ON "reviews"("client_id", "expert_id");

DROP INDEX IF EXISTS "reviews_specialist_id_idx";
CREATE INDEX IF NOT EXISTS "reviews_expert_id_is_visible_idx" ON "reviews"("expert_id", "is_visible");

DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== DISCLAIMER ACCEPTANCES ====================

CREATE TABLE IF NOT EXISTS "disclaimer_acceptances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "disclaimer_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "disclaimer_acceptances_user_id_type_key" ON "disclaimer_acceptances"("user_id", "type");

DO $$ BEGIN
    ALTER TABLE "disclaimer_acceptances" ADD CONSTRAINT "disclaimer_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== ABUSE REPORTS ====================

CREATE TABLE IF NOT EXISTS "abuse_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reported_user_id" TEXT,
    "reported_expert_id" TEXT,
    "conversation_id" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "abuse_reports_status_idx" ON "abuse_reports"("status");

DO $$ BEGIN
    ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== USER BLOCKS ====================

CREATE TABLE IF NOT EXISTS "user_blocks" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");

DO $$ BEGIN
    ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== UPDATE ARTICLES ====================

ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "expert_id" TEXT;
CREATE INDEX IF NOT EXISTS "articles_expert_id_idx" ON "articles"("expert_id");

DO $$ BEGIN
    ALTER TABLE "articles" ADD CONSTRAINT "articles_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== MIGRATE DATA FROM SPECIALISTS ====================
-- Migrate existing specialists to expert_profiles

INSERT INTO "expert_profiles" (
    "id",
    "user_id",
    "type",
    "display_name",
    "bio",
    "avatar_url",
    "languages",
    "is_verified",
    "is_active",
    "is_published",
    "rating",
    "review_count",
    "created_at",
    "updated_at"
)
SELECT 
    "id",
    "user_id",
    "type",
    "display_name",
    "bio",
    "avatar_url",
    "languages",
    "is_verified",
    "is_active",
    true, -- is_published
    "rating",
    "review_count",
    "created_at",
    "updated_at"
FROM "specialists"
ON CONFLICT ("user_id") DO NOTHING;

-- Create default offers from specialists' price
INSERT INTO "expert_offers" (
    "id",
    "expert_id",
    "name",
    "format",
    "price_type",
    "price_amount",
    "currency",
    "duration_days",
    "is_published",
    "created_at",
    "updated_at"
)
SELECT 
    gen_random_uuid()::text,
    "id",
    '{"en": "Weekly Consultation", "ru": "Недельная консультация", "kk": "Апталық кеңес"}'::jsonb,
    'CHAT_CONSULTATION',
    'FIXED',
    "price_per_week",
    "currency",
    7,
    true,
    "created_at",
    "updated_at"
FROM "specialists"
WHERE "price_per_week" > 0;

-- Migrate consultations to conversations
INSERT INTO "conversations" (
    "id",
    "client_id",
    "expert_id",
    "status",
    "started_at",
    "created_at",
    "updated_at"
)
SELECT 
    "id",
    "client_id",
    "specialist_id", -- specialist_id = expert_id (same IDs)
    "status",
    "starts_at",
    "created_at",
    "updated_at"
FROM "consultations"
ON CONFLICT ("client_id", "expert_id") DO NOTHING;

-- Update users who are specialists to have EXPERT role
UPDATE "users" SET "experts_role" = 'EXPERT' 
WHERE "id" IN (SELECT "user_id" FROM "specialists");

-- Drop old tables (CAREFUL - do this only after verifying migration)
-- DROP TABLE IF EXISTS "consultations" CASCADE;
-- DROP TABLE IF EXISTS "specialists" CASCADE;

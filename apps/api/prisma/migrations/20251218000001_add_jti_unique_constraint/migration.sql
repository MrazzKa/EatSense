-- Add jti column + indexes for refresh_tokens
-- This migration adds the jti column (if it doesn't exist) and creates necessary indexes

-- Step 1: Add jti column if it doesn't exist
ALTER TABLE "refresh_tokens"
  ADD COLUMN IF NOT EXISTS "jti" TEXT;

-- Step 2: Create unique index on jti (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_jti_key"
  ON "refresh_tokens"("jti")
  WHERE "jti" IS NOT NULL;

-- Step 3: Create index on userId for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx"
  ON "refresh_tokens"("userId");

